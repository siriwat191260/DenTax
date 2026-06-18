using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace DentaLedger.API.Models;

public class Receipt
{
    public Guid    Id          { get; set; } = Guid.NewGuid();
    public Guid    UserId      { get; set; }

    [Required] public DateOnly Date        { get; set; }
    [Required] public string   IncomeType  { get; set; } = "40-6"; // 40-1 | 40-2 | 40-6
    [Required] public string   Category    { get; set; } = string.Empty;
    public string?             Patient     { get; set; }
    [Required] public string   Payment     { get; set; } = "เงินสด";
    public decimal             Total       { get; set; }
    public string?             Note        { get; set; }
    public string?             ImageUrl    { get; set; }

    // stored as jsonb
    public List<ReceiptItem>   Items       { get; set; } = [];

    public DateTimeOffset      CreatedAt   { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset      UpdatedAt   { get; set; } = DateTimeOffset.UtcNow;
}

public class ReceiptItem
{
    public string  Name   { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class TaxSettings
{
    public Guid    Id               { get; set; } = Guid.NewGuid();
    public Guid    UserId           { get; set; }
    public int     TaxYear          { get; set; }
    public string  IncomeType       { get; set; } = "40-6";
    public decimal DeductPersonal   { get; set; } = 60_000;
    public decimal DeductSpouse     { get; set; }
    public decimal DeductChild      { get; set; }
    public decimal DeductParent     { get; set; }
    public decimal DeductLifeIns    { get; set; }
    public decimal DeductHealthIns  { get; set; }
    public decimal DeductRmf        { get; set; }
    public decimal DeductSsf        { get; set; }
    public decimal DeductPvd        { get; set; }
    public decimal DeductOther      { get; set; }
    public decimal ExtraIncome      { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
