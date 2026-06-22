using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DentaLedger.API.Services;

public interface IGeminiService
{
    Task<ScanResult> ScanReceiptAsync(Stream imageStream, string contentType);
}

public record ScanResult(
    string?           Date,
    string            Patient,
    string            Category,
    string            Payment,
    List<ScanItem>    Items,
    decimal           Total,
    string            Note,
    double            Confidence
);

public record ScanItem(string Name, decimal Amount);

public class GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> logger)
    : IGeminiService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private const string Prompt = """
        วิเคราะห์เอกสารในภาพนี้ เอกสารอาจเป็นได้ 2 แบบ:

        แบบที่ 1 — ใบเสร็จรับเงินรายการเดียว (ใบเสร็จคนไข้คนเดียว)
        แบบที่ 2 — รายงานสรุปรายได้ทันตแพทย์รายวัน (มีตารางหลายแถว หลายคนไข้
                   และมีส่วน "Dentist Fee" หรือ "DF" สรุปท้ายตาราง)

        กรณีเป็นแบบที่ 2 (รายงานสรุปรายวัน) ให้ดึงค่าตามนี้:
        - date: วันที่ของรายงาน (พ.ศ. ให้แปลงเป็น ค.ศ. โดยลบ 543 ปี)
        - patient: ชื่อทันตแพทย์ (จากหัวรายงานหรือตาราง "Dentist Fee")
        - category: "สรุปรายได้รายวัน"
        - total: ใช้ค่า "Net DF" (ส่วนแบ่งสุทธิของหมอ หลังหัก lab fee และ promotion)
                 ไม่ใช่ยอดขายรวม (Total/ยอดเรียกเก็บ) และไม่ใช่ DF ก่อนหัก
        - items: สร้างรายการเดียว [{"name": "ส่วนแบ่งรายได้ทันตแพทย์ (Net DF)", "amount": <Net DF>}]
        - note: ใส่จำนวนคนไข้ในรายงาน เช่น "15 ราย"

        กรณีเป็นแบบที่ 1 (ใบเสร็จปกติ) ให้ดึงข้อมูลตามปกติ:
        - date, patient (ชื่อคนไข้), category (ประเภทบริการ), payment, items แต่ละรายการ, total

        ตอบเป็น JSON เท่านั้น ไม่มี markdown ไม่มี backtick ห้ามมีคำอธิบายอื่นนอกเหนือ JSON:
        {
          "date": "YYYY-MM-DD หรือ null ถ้าไม่พบ",
          "patient": "ชื่อผู้ป่วยหรือชื่อทันตแพทย์ หรือ empty string",
          "category": "ประเภทบริการทันตกรรม หรือ สรุปรายได้รายวัน",
          "payment": "ช่องทางชำระเงิน หรือ empty string ถ้าไม่เกี่ยวข้อง",
          "items": [{"name": "รายการ", "amount": 0}],
          "total": 0,
          "note": "หมายเหตุถ้ามี",
          "confidence": 0.0
        }
        ถ้าไม่แน่ใจตัวเลข ให้ confidence ต่ำกว่า 0.7
        """;

    public async Task<ScanResult> ScanReceiptAsync(Stream imageStream, string contentType)
    {
        var apiKey  = config["Gemini:ApiKey"]!;
        var model   = config["Gemini:Model"] ?? "gemini-2.5-flash";
        var baseUrl = config["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";

        // Convert image to base64
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var base64 = Convert.ToBase64String(ms.ToArray());
        var mimeType = contentType.StartsWith("image/") ? contentType : "image/jpeg";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { inline_data = new { mime_type = mimeType, data = base64 } },
                        new { text = Prompt }
                    }
                }
            },
            generation_config = new
            {
                temperature      = 0.1,
                response_mime_type = "application/json"
            }
        };

        var url      = $"{baseUrl}/models/{model}:generateContent?key={apiKey}";
        var requestJson = JsonSerializer.Serialize(requestBody);

        HttpResponseMessage response = null!;
        const int maxAttempts = 3;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var content = new StringContent(requestJson, Encoding.UTF8, "application/json");
            response = await http.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
                break;

            // Retry on transient errors: 503 Service Unavailable, 429 Too Many Requests, 500/502/504
            var isTransient = response.StatusCode is System.Net.HttpStatusCode.ServiceUnavailable
                or System.Net.HttpStatusCode.TooManyRequests
                or System.Net.HttpStatusCode.InternalServerError
                or System.Net.HttpStatusCode.BadGateway
                or System.Net.HttpStatusCode.GatewayTimeout;

            if (!isTransient || attempt == maxAttempts)
            {
                var err = await response.Content.ReadAsStringAsync();
                logger.LogError("Gemini API error {Status} (attempt {Attempt}/{Max}): {Error}",
                    response.StatusCode, attempt, maxAttempts, err);
                throw new InvalidOperationException($"Gemini API error: {response.StatusCode}");
            }

            var delaySeconds = Math.Pow(2, attempt - 1); // 1s, 2s, 4s
            logger.LogWarning("Gemini API returned {Status}, retrying in {Delay}s (attempt {Attempt}/{Max})",
                response.StatusCode, delaySeconds, attempt, maxAttempts);
            await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
        }

        var body = await response.Content.ReadAsStringAsync();

        // Parse Gemini response envelope
        using var doc       = JsonDocument.Parse(body);
        var       textPart  = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        // Clean up if model wraps in markdown despite instruction
        textPart = textPart.Trim();
        if (textPart.StartsWith("```")) textPart = textPart.Split('\n', 2)[1];
        if (textPart.EndsWith("```"))  textPart = textPart[..^3];

        try
        {
            var parsed = JsonSerializer.Deserialize<GeminiReceiptJson>(textPart, JsonOpts)
                         ?? throw new InvalidOperationException("Empty parse result");

            return new ScanResult(
                Date:       parsed.Date,
                Patient:    parsed.Patient ?? string.Empty,
                Category:   parsed.Category ?? "รายได้อื่นๆ",
                Payment:    parsed.Payment  ?? "เงินสด",
                Items:      parsed.Items?.Select(i => new ScanItem(i.Name ?? "", i.Amount)).ToList() ?? [],
                Total:      parsed.Total,
                Note:       parsed.Note    ?? string.Empty,
                Confidence: parsed.Confidence
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse Gemini response: {Text}", textPart);
            return new ScanResult(null, "", "รายได้อื่นๆ", "เงินสด", [], 0, "", 0);
        }
    }

    // Internal DTO for Gemini JSON response
    private record GeminiReceiptJson(
        string?              Date,
        string?              Patient,
        string?              Category,
        string?              Payment,
        List<GeminiItem>?    Items,
        decimal              Total,
        string?              Note,
        double               Confidence
    );

    private record GeminiItem(string? Name, decimal Amount);
}