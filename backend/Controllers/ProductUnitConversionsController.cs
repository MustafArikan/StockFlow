using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Constants;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using stok_takip.Attributes;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/products/{productId}/unit-conversions")]
[Authorize]
public class ProductUnitConversionsController : ControllerBase
{
    private readonly AppDbContext _context;
    public ProductUnitConversionsController(AppDbContext context) => _context = context;

    [RequirePermission(Policies.RequireProductRead)]
    [HttpGet]
    public async Task<IActionResult> GetAll(int productId)
    {
        var list = await _context.ProductUnitConversions
            .AsNoTracking()
            .Where(c => c.ProductId == productId && !c.IsDeleted)
            .Include(c => c.AlternativeUnit)
            .Select(c => new ProductUnitConversionDto
            {
                Id = c.Id,
                AlternativeUnitId = c.AlternativeUnitId,
                AlternativeUnitName = c.AlternativeUnit.Name,
                AlternativeUnitShortCode = c.AlternativeUnit.ShortCode,
                Barcode = c.Barcode,
                BarcodeType = c.BarcodeType.ToString(),
                ConversionFactor = c.ConversionFactor,
                IsDefault = c.IsDefault
            }).ToListAsync();

        return Ok(list);
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    [HttpPost]
    public async Task<IActionResult> Create(int productId, CreateProductUnitConversionDto dto)
    {
        var product = await _context.Products.Include(p => p.Unit).FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted);
        if (product == null) return NotFound(new { message = "Ürün bulunamadı." });

        if (dto.AlternativeUnitId == product.UnitId)
            return BadRequest(new { message = "Alternatif birim, ürünün taban birimiyle aynı olamaz." });

        var altUnit = await _context.Units.FirstOrDefaultAsync(u => u.Id == dto.AlternativeUnitId && u.IsActive && !u.IsDeleted);
        if (altUnit == null)
            return BadRequest(new { message = "Belirtilen alternatif birim bulunamadı veya pasif." });

        var exists = await _context.ProductUnitConversions
            .AnyAsync(c => c.ProductId == productId && c.AlternativeUnitId == dto.AlternativeUnitId && !c.IsDeleted);
        if (exists)
            return BadRequest(new { message = "Bu birim için zaten bir çevrim tanımı mevcut. Düzenlemek için güncelleme uçlarını kullanın." });

        var conversion = new ProductUnitConversion
        {
            ProductId = productId,
            AlternativeUnitId = dto.AlternativeUnitId,
            Barcode = dto.Barcode,
            BarcodeType = stok_takip.Services.BarcodeTypeDetector.Detect(dto.Barcode),
            ConversionFactor = dto.ConversionFactor,
            IsDefault = dto.IsDefault
        };
        _context.ProductUnitConversions.Add(conversion);
        await _context.SaveChangesAsync();

        bool categoryMismatch = altUnit.Category != product.Unit.Category;
        return Ok(new {
            message = "Birim çevrimi eklendi.",
            id = conversion.Id,
            warning = categoryMismatch
                ? "Seçtiğiniz birim, ürünün taban birimiyle farklı bir ölçü kategorisinde. Bu genelde kasıtlı bir senaryodur (örn. 'çuval → kg') ama yanlışlıkla seçmediğinizden emin olun."
                : (string?)null
        });
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int productId, int id)
    {
        var conversion = await _context.ProductUnitConversions
            .FirstOrDefaultAsync(c => c.Id == id && c.ProductId == productId && !c.IsDeleted);
        if (conversion == null) return NotFound();

        // Bu birimle daha önce hareket girilmiş mi? (InputUnitId üzerinden denetim izi bütünlüğü)
        var usedInMovements = await _context.StockMovements
            .AnyAsync(m => m.ProductId == productId && m.InputUnitId == conversion.AlternativeUnitId);

        if (usedInMovements)
            return BadRequest(new { message = "Bu birim geçmişte stok hareketlerinde kullanıldığı için silinemez. Yalnızca yeni hareketlerde kullanılmasını engellemek isterseniz bu özelliği pasifleştirme ile genişletebilirsiniz." });

        conversion.IsDeleted = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Çevrim tanımı silindi." });
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [HttpPost("{id}/generate-barcode")]
    public async Task<IActionResult> GenerateBarcode(int productId, int id)
    {
        var conversion = await _context.ProductUnitConversions
            .FirstOrDefaultAsync(c => c.Id == id && c.ProductId == productId && !c.IsDeleted);
        if (conversion == null) return NotFound();

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId);
        if (product == null || product.BarcodeType != BarcodeType.Gtin13_Ean13)
            return BadRequest(new { message = "Otomatik koli/palet barkodu üretmek için ürünün geçerli bir GTIN-13 (EAN-13) barkodu olmalıdır." });

        var usedLevels = await _context.ProductUnitConversions
            .Where(c => c.ProductId == productId && c.Barcode != null && !c.IsDeleted)
            .Select(c => c.Barcode!.Substring(0, 1))
            .ToListAsync();

        int level = Enumerable.Range(1, 8).FirstOrDefault(l => !usedLevels.Contains(l.ToString()));
        if (level == 0) return BadRequest(new { message = "Kullanılabilecek paketleme seviyesi kalmadı (maksimum 8)." });

        var gtin14 = stok_takip.Services.Gs1CheckDigitCalculator.GenerateGtin14FromGtin13(product.Barcode, level);

        conversion.Barcode = gtin14;
        conversion.BarcodeType = BarcodeType.Gtin14_Itf14;
        await _context.SaveChangesAsync();

        return Ok(new { barcode = gtin14 });
    }
}
