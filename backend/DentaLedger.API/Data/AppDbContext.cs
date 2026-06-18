using DentaLedger.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DentaLedger.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Receipt>     Receipts     => Set<Receipt>();
    public DbSet<TaxSettings> TaxSettings  => Set<TaxSettings>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Receipt>(e =>
        {
            e.ToTable("receipts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Date).HasColumnName("date");
            e.Property(x => x.IncomeType).HasColumnName("income_type");
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.Patient).HasColumnName("patient");
            e.Property(x => x.Payment).HasColumnName("payment");
            e.Property(x => x.Total).HasColumnName("total").HasColumnType("numeric(12,2)");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            // Map items as JSONB
            e.Property(x => x.Items)
             .HasColumnName("items")
             .HasColumnType("jsonb")
             .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<ReceiptItem>>(v, (JsonSerializerOptions?)null) ?? new());
        });

        model.Entity<TaxSettings>(e =>
        {
            e.ToTable("tax_settings");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.TaxYear).HasColumnName("tax_year");
            e.Property(x => x.IncomeType).HasColumnName("income_type");
            e.Property(x => x.DeductPersonal).HasColumnName("deduct_personal").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductSpouse).HasColumnName("deduct_spouse").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductChild).HasColumnName("deduct_child").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductParent).HasColumnName("deduct_parent").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductLifeIns).HasColumnName("deduct_life_ins").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductHealthIns).HasColumnName("deduct_health_ins").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductRmf).HasColumnName("deduct_rmf").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductSsf).HasColumnName("deduct_ssf").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductPvd).HasColumnName("deduct_pvd").HasColumnType("numeric(12,2)");
            e.Property(x => x.DeductOther).HasColumnName("deduct_other").HasColumnType("numeric(12,2)");
            e.Property(x => x.ExtraIncome).HasColumnName("extra_income").HasColumnType("numeric(12,2)");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => new { x.UserId, x.TaxYear }).IsUnique();
        });
    }
}
