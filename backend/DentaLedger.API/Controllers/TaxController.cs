using DentaLedger.API.Data;
using DentaLedger.API.Models;
using DentaLedger.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DentaLedger.API.Controllers;

[Authorize]
[ApiController]
[Route("api/tax")]
public class TaxController(AppDbContext db, ITaxService taxService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub")!);

    // POST /api/tax/calculate
    [HttpPost("calculate")]
    public ActionResult<TaxResultDto> Calculate([FromBody] TaxInputDto dto)
    {
        var result = taxService.Calculate(new TaxCalculationInput(
            GrossIncome:      dto.GrossIncome,
            ExtraIncome:      dto.ExtraIncome,
            IncomeType:       dto.IncomeType,
            DeductPersonal:   dto.DeductPersonal,
            DeductSpouse:     dto.DeductSpouse,
            DeductChild:      dto.DeductChild,
            DeductParent:     dto.DeductParent,
            DeductLifeIns:    dto.DeductLifeIns,
            DeductHealthIns:  dto.DeductHealthIns,
            DeductRmf:        dto.DeductRmf,
            DeductSsf:        dto.DeductSsf,
            DeductPvd:        dto.DeductPvd,
            DeductOther:      dto.DeductOther,
            HalfYearIncome:   dto.HalfYearIncome
        ));

        return Ok(new TaxResultDto(
            result.GrossIncome,    result.ExpenseDeduction,
            result.NetAfterExpense, result.TotalDeductions,
            result.NetIncome,       result.Tax,
            result.EffectiveRate,   result.Bracket,
            result.HalfYearTax
        ));
    }

    // GET /api/tax/settings/{year}
    [HttpGet("settings/{year:int}")]
    public async Task<ActionResult<TaxSettingsDto>> GetSettings(int year)
    {
        var settings = await db.TaxSettings
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.TaxYear == year);

        if (settings is null)
            return Ok(DefaultSettings(year));

        return Ok(ToDto(settings));
    }

    // POST /api/tax/settings
    [HttpPost("settings")]
    public async Task<ActionResult<TaxSettingsDto>> SaveSettings([FromBody] TaxSettingsDto dto)
    {
        var settings = await db.TaxSettings
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.TaxYear == dto.TaxYear);

        if (settings is null)
        {
            settings = new TaxSettings { UserId = UserId };
            db.TaxSettings.Add(settings);
        }

        settings.TaxYear         = dto.TaxYear;
        settings.IncomeType      = dto.IncomeType;
        settings.DeductPersonal  = dto.DeductPersonal;
        settings.DeductSpouse    = dto.DeductSpouse;
        settings.DeductChild     = dto.DeductChild;
        settings.DeductParent    = dto.DeductParent;
        settings.DeductLifeIns   = dto.DeductLifeIns;
        settings.DeductHealthIns = dto.DeductHealthIns;
        settings.DeductRmf       = dto.DeductRmf;
        settings.DeductSsf       = dto.DeductSsf;
        settings.DeductPvd       = dto.DeductPvd;
        settings.DeductOther     = dto.DeductOther;
        settings.ExtraIncome     = dto.ExtraIncome;
        settings.UpdatedAt       = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(settings));
    }

    private static TaxSettingsDto DefaultSettings(int year) => new(
        year, "40-6", 60_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    private static TaxSettingsDto ToDto(TaxSettings s) => new(
        s.TaxYear,       s.IncomeType,      s.DeductPersonal,
        s.DeductSpouse,  s.DeductChild,     s.DeductParent,
        s.DeductLifeIns, s.DeductHealthIns, s.DeductRmf,
        s.DeductSsf,     s.DeductPvd,       s.DeductOther,
        s.ExtraIncome);
}

public record TaxInputDto(
    decimal GrossIncome, decimal ExtraIncome, string IncomeType,
    decimal DeductPersonal, decimal DeductSpouse, decimal DeductChild, decimal DeductParent,
    decimal DeductLifeIns, decimal DeductHealthIns,
    decimal DeductRmf, decimal DeductSsf, decimal DeductPvd, decimal DeductOther,
    decimal HalfYearIncome = 0);

public record TaxResultDto(
    decimal GrossIncome, decimal ExpenseDeduction, decimal NetAfterExpense,
    decimal TotalDeductions, decimal NetIncome, decimal Tax,
    double EffectiveRate, int Bracket, decimal HalfYearTax);

public record TaxSettingsDto(
    int TaxYear, string IncomeType,
    decimal DeductPersonal, decimal DeductSpouse, decimal DeductChild, decimal DeductParent,
    decimal DeductLifeIns, decimal DeductHealthIns,
    decimal DeductRmf, decimal DeductSsf, decimal DeductPvd, decimal DeductOther,
    decimal ExtraIncome);
