using DentaLedger.API.Data;
using DentaLedger.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DentaLedger.API.Controllers;

[Authorize]
[ApiController]
[Route("api/receipts")]
public class ReceiptsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub")!);

    // GET /api/receipts?from=2024-01-01&to=2024-12-31
    [HttpGet]
    public async Task<ActionResult<List<ReceiptDto>>> List(
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var query = db.Receipts
            .Where(r => r.UserId == UserId)
            .AsQueryable();

        if (DateOnly.TryParse(from, out var fromDate))
            query = query.Where(r => r.Date >= fromDate);
        if (DateOnly.TryParse(to, out var toDate))
            query = query.Where(r => r.Date <= toDate);

        var receipts = await query
            .OrderByDescending(r => r.Date)
            .ThenByDescending(r => r.CreatedAt)
            .Select(r => ToDto(r))
            .ToListAsync();

        return Ok(receipts);
    }

    // GET /api/receipts/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReceiptDto>> Get(Guid id)
    {
        var receipt = await db.Receipts.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (receipt is null) return NotFound();
        return Ok(ToDto(receipt));
    }

    // POST /api/receipts
    [HttpPost]
    public async Task<ActionResult<ReceiptDto>> Create([FromBody] CreateReceiptDto dto)
    {
        var receipt = new Receipt
        {
            UserId     = UserId,
            Date       = DateOnly.Parse(dto.Date),
            IncomeType = dto.IncomeType,
            Category   = dto.Category,
            Patient    = dto.Patient,
            Payment    = dto.Payment,
            Total      = dto.Total,
            Note       = dto.Note,
            ImageUrl   = dto.ImageUrl,
            Items      = dto.Items.Select(i => new ReceiptItem { Name = i.Name, Amount = i.Amount }).ToList(),
        };

        db.Receipts.Add(receipt);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = receipt.Id }, ToDto(receipt));
    }

    // PUT /api/receipts/{id}
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ReceiptDto>> Update(Guid id, [FromBody] CreateReceiptDto dto)
    {
        var receipt = await db.Receipts.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (receipt is null) return NotFound();

        receipt.Date       = DateOnly.Parse(dto.Date);
        receipt.IncomeType = dto.IncomeType;
        receipt.Category   = dto.Category;
        receipt.Patient    = dto.Patient;
        receipt.Payment    = dto.Payment;
        receipt.Total      = dto.Total;
        receipt.Note       = dto.Note;
        receipt.ImageUrl   = dto.ImageUrl;
        receipt.Items      = dto.Items.Select(i => new ReceiptItem { Name = i.Name, Amount = i.Amount }).ToList();
        receipt.UpdatedAt  = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(receipt));
    }

    // DELETE /api/receipts/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var receipt = await db.Receipts.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (receipt is null) return NotFound();
        db.Receipts.Remove(receipt);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/receipts/summary?year=2024
    [HttpGet("summary")]
    public async Task<ActionResult<SummaryDto>> Summary([FromQuery] int? year)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var receipts   = await db.Receipts
            .Where(r => r.UserId == UserId && r.Date.Year == targetYear)
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return Ok(new SummaryDto(
            Today:       receipts.Where(r => r.Date == today).Sum(r => r.Total),
            ThisMonth:   receipts.Where(r => r.Date.Month == today.Month).Sum(r => r.Total),
            ThisYear:    receipts.Sum(r => r.Total),
            CountToday:  receipts.Count(r => r.Date == today),
            CountMonth:  receipts.Count(r => r.Date.Month == today.Month),
            CountYear:   receipts.Count,
            ByMonth: Enumerable.Range(1, 12)
                .Select(m => new MonthlyTotal(m, receipts.Where(r => r.Date.Month == m).Sum(r => r.Total)))
                .ToList(),
            ByCategory: receipts
                .GroupBy(r => r.Category)
                .Select(g => new CategoryTotal(g.Key, g.Sum(r => r.Total)))
                .OrderByDescending(x => x.Total)
                .ToList()
        ));
    }

    private static ReceiptDto ToDto(Receipt r) => new(
        r.Id.ToString(), r.Date.ToString("yyyy-MM-dd"),
        r.IncomeType, r.Category, r.Patient, r.Payment,
        r.Total, r.Note, r.ImageUrl,
        r.Items.Select(i => new ItemDto(i.Name, i.Amount)).ToList(),
        r.CreatedAt.ToString("o")
    );
}

// DTOs
public record ReceiptDto(
    string Id, string Date, string IncomeType, string Category,
    string? Patient, string Payment, decimal Total, string? Note, string? ImageUrl,
    List<ItemDto> Items, string CreatedAt);

public record ItemDto(string Name, decimal Amount);

public record CreateReceiptDto(
    string Date, string IncomeType, string Category,
    string? Patient, string Payment, decimal Total,
    string? Note, string? ImageUrl, List<ItemDto> Items);

public record SummaryDto(
    decimal Today, decimal ThisMonth, decimal ThisYear,
    int CountToday, int CountMonth, int CountYear,
    List<MonthlyTotal> ByMonth, List<CategoryTotal> ByCategory);

public record MonthlyTotal(int Month, decimal Total);
public record CategoryTotal(string Category, decimal Total);
