using DentaLedger.API.Data;
using DentaLedger.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DentaLedger.API.Services;

public interface IReceiptService
{
    Task<List<Receipt>> ListAsync(Guid userId, DateOnly? from, DateOnly? to);
    Task<Receipt?>      GetAsync(Guid userId, Guid id);
    Task<Receipt>       CreateAsync(Guid userId, Receipt receipt);
    Task<Receipt?>      UpdateAsync(Guid userId, Guid id, Receipt updated);
    Task<bool>          DeleteAsync(Guid userId, Guid id);
}

public class ReceiptService(AppDbContext db) : IReceiptService
{
    public Task<List<Receipt>> ListAsync(Guid userId, DateOnly? from, DateOnly? to)
    {
        var q = db.Receipts.Where(r => r.UserId == userId).AsQueryable();
        if (from.HasValue) q = q.Where(r => r.Date >= from.Value);
        if (to.HasValue)   q = q.Where(r => r.Date <= to.Value);
        return q.OrderByDescending(r => r.Date).ThenByDescending(r => r.CreatedAt).ToListAsync();
    }

    public Task<Receipt?> GetAsync(Guid userId, Guid id) =>
        db.Receipts.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

    public async Task<Receipt> CreateAsync(Guid userId, Receipt receipt)
    {
        receipt.UserId = userId;
        db.Receipts.Add(receipt);
        await db.SaveChangesAsync();
        return receipt;
    }

    public async Task<Receipt?> UpdateAsync(Guid userId, Guid id, Receipt updated)
    {
        var existing = await GetAsync(userId, id);
        if (existing is null) return null;

        existing.Date       = updated.Date;
        existing.IncomeType = updated.IncomeType;
        existing.Category   = updated.Category;
        existing.Patient    = updated.Patient;
        existing.Payment    = updated.Payment;
        existing.Total      = updated.Total;
        existing.Note       = updated.Note;
        existing.ImageUrl   = updated.ImageUrl;
        existing.Items      = updated.Items;
        existing.UpdatedAt  = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id)
    {
        var existing = await GetAsync(userId, id);
        if (existing is null) return false;
        db.Receipts.Remove(existing);
        await db.SaveChangesAsync();
        return true;
    }
}
