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
        วิเคราะห์ใบเสร็จในภาพนี้ ตอบเป็น JSON เท่านั้น ไม่มี markdown ไม่มี backtick
        {
          "date": "YYYY-MM-DD หรือ null ถ้าไม่พบ",
          "patient": "ชื่อผู้ป่วยหรือผู้จ่าย หรือ empty string",
          "category": "ประเภทบริการทันตกรรม",
          "payment": "ช่องทางชำระเงิน",
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
        var content  = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        var response = await http.PostAsync(url, content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            logger.LogError("Gemini API error {Status}: {Error}", response.StatusCode, err);
            throw new InvalidOperationException($"Gemini API error: {response.StatusCode}");
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
