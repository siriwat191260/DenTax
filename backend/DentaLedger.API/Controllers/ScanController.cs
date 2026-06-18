using DentaLedger.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DentaLedger.API.Controllers;

[Authorize]
[ApiController]
[Route("api/scan")]
public class ScanController(IGeminiService gemini, ILogger<ScanController> logger) : ControllerBase
{
    private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

    [HttpPost]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<ScanResponseDto>> Scan(IFormFile image)
    {
        if (image is null || image.Length == 0)
            return BadRequest("No image provided");

        if (image.Length > MaxFileSize)
            return BadRequest("Image too large (max 10 MB)");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(image.ContentType.ToLower()))
            return BadRequest("Unsupported image type");

        logger.LogInformation("Scanning receipt image: {FileName} ({Size} bytes)", image.FileName, image.Length);

        await using var stream = image.OpenReadStream();
        var result = await gemini.ScanReceiptAsync(stream, image.ContentType);

        return Ok(new ScanResponseDto(
            Date:       result.Date,
            Patient:    result.Patient,
            Category:   result.Category,
            Payment:    result.Payment,
            Items:      result.Items.Select(i => new ScanItemDto(i.Name, i.Amount)).ToList(),
            Total:      result.Total,
            Note:       result.Note,
            Confidence: result.Confidence
        ));
    }
}

public record ScanResponseDto(
    string?           Date,
    string            Patient,
    string            Category,
    string            Payment,
    List<ScanItemDto> Items,
    decimal           Total,
    string            Note,
    double            Confidence
);

public record ScanItemDto(string Name, decimal Amount);
