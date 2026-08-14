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
    private readonly IConfiguration _config;
    public ProductUnitConversionsController(AppDbContext context, IConfiguration config) 
    {
        _context = context;
        _config = config;
    }

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
        if (product == null) return NotFound(new { message = "ÃœrÃ¼n bulunamadÄ±." });

        if (dto.AlternativeUnitId == product.UnitId)
            return BadRequest(new { message = "Alternatif birim, Ã¼rÃ¼nÃ¼n taban birimiyle aynÄ± olamaz." });

        var altUnit = await _context.Units.FirstOrDefaultAsync(u => u.Id == dto.AlternativeUnitId && u.IsActive && !u.IsDeleted);
        if (altUnit == null)
            return BadRequest(new { message = "Belirtilen alternatif birim bulunamadÄ± veya pasif." });

        var existingConversion = await _context.ProductUnitConversions
            .FirstOrDefaultAsync(c => c.ProductId == productId && c.AlternativeUnitId == dto.AlternativeUnitId);
            
        if (existingConversion != null)
        {
            if (!existingConversion.IsDeleted)
            {
                return BadRequest(new { message = "Bu birim iÃ§in zaten bir Ã§evrim tanÄ±mÄ± mevcut. DÃ¼zenlemek iÃ§in gÃ¼ncelleme uÃ§larÄ±nÄ± kullanÄ±n." });
            }
            else
            {
                // Reactivate soft-deleted record
                existingConversion.IsDeleted = false;
                existingConversion.Barcode = dto.Barcode;
                existingConversion.BarcodeType = stok_takip.Services.BarcodeTypeDetector.Detect(dto.Barcode);
                existingConversion.ConversionFactor = dto.ConversionFactor;
                existingConversion.IsDefault = dto.IsDefault;
                
                await _context.SaveChangesAsync();
                
                bool isCategoryMismatch = altUnit.Category != product.Unit.Category;
                return Ok(new {
                    message = "Birim Ã§evrimi eklendi (eski kayÄ±t geri yÃ¼klendi).",
                    id = existingConversion.Id,
                    warning = isCategoryMismatch
                        ? "SeÃ§tiÄŸiniz birim, Ã¼rÃ¼nÃ¼n taban birimiyle farklÄ± bir Ã¶lÃ§Ã¼ kategorisinde. Bu genelde kasÄ±tlÄ± bir senaryodur (Ã¶rn. 'Ã§uval â†’ kg') ama yanlÄ±ÅŸlÄ±kla seÃ§mediÄŸinizden emin olun."
                        : (string?)null
                });
            }
        }

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
            message = "Birim Ã§evrimi eklendi.",
            id = conversion.Id,
            warning = categoryMismatch
                ? "SeÃ§tiÄŸiniz birim, Ã¼rÃ¼nÃ¼n taban birimiyle farklÄ± bir Ã¶lÃ§Ã¼ kategorisinde. Bu genelde kasÄ±tlÄ± bir senaryodur (Ã¶rn. 'Ã§uval â†’ kg') ama yanlÄ±ÅŸlÄ±kla seÃ§mediÄŸinizden emin olun."
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

        // Bu birimle daha Ã¶nce hareket girilmiÅŸ mi? (InputUnitId Ã¼zerinden denetim izi bÃ¼tÃ¼nlÃ¼ÄŸÃ¼)
        var usedInMovements = await _context.StockMovements
            .AnyAsync(m => m.ProductId == productId && m.InputUnitId == conversion.AlternativeUnitId);

        if (usedInMovements)
            return BadRequest(new { message = "Bu birim geÃ§miÅŸte stok hareketlerinde kullanÄ±ldÄ±ÄŸÄ± iÃ§in silinemez. YalnÄ±zca yeni hareketlerde kullanÄ±lmasÄ±nÄ± engellemek isterseniz bu Ã¶zelliÄŸi pasifleÅŸtirme ile geniÅŸletebilirsiniz." });

        conversion.IsDeleted = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Ã‡evrim tanÄ±mÄ± silindi." });
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [HttpPost("{id}/generate-barcode")]
    public async Task<IActionResult> GenerateBarcode(int productId, int id)
    {
        var conversion = await _context.ProductUnitConversions
            .Include(c => c.AlternativeUnit)
            .FirstOrDefaultAsync(c => c.Id == id && c.ProductId == productId && !c.IsDeleted);
        if (conversion == null) return NotFound();

        var isPallet = conversion.AlternativeUnit?.Name?.Contains("Palet", StringComparison.OrdinalIgnoreCase) == true
                    || conversion.AlternativeUnit?.ShortCode?.Contains("PLT", StringComparison.OrdinalIgnoreCase) == true;

        if (isPallet)
        {
            var companyPrefix = _config["Gs1Settings:CompanyPrefix"] ?? "8691234";
            int serialLength = 16 - companyPrefix.Length;
            var randomSerial = new Random().Next(0, (int)Math.Pow(10, serialLength)).ToString().PadLeft(serialLength, '0');
            var body = "3" + companyPrefix + randomSerial; // extension digit 3
            var sscc = body + stok_takip.Services.Gs1CheckDigitCalculator.Calculate(body);

            conversion.Barcode = sscc;
            conversion.BarcodeType = BarcodeType.Sscc18;
            await _context.SaveChangesAsync();
            return Ok(new { barcode = sscc });
        }

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId);
        if (product == null || product.BarcodeType != BarcodeType.Gtin13_Ean13)
            return BadRequest(new { message = "Otomatik koli/palet barkodu Ã¼retmek iÃ§in Ã¼rÃ¼nÃ¼n geÃ§erli bir GTIN-13 (EAN-13) barkodu olmalÄ±dÄ±r. Palet birimleri iÃ§in bu ÅŸart aranmaz." });

        var usedLevels = await _context.ProductUnitConversions
            .Where(c => c.ProductId == productId && c.Barcode != null && !c.IsDeleted)
            .Select(c => c.Barcode!.Substring(0, 1))
            .ToListAsync();

        int level = Enumerable.Range(1, 8).FirstOrDefault(l => !usedLevels.Contains(l.ToString()));
        if (level == 0) return BadRequest(new { message = "KullanÄ±labilecek paketleme seviyesi kalmadÄ± (maksimum 8)." });

        var gtin14 = stok_takip.Services.Gs1CheckDigitCalculator.GenerateGtin14FromGtin13(product.Barcode, level);

        conversion.Barcode = gtin14;
        conversion.BarcodeType = BarcodeType.Gtin14_Itf14;
        await _context.SaveChangesAsync();

        return Ok(new { barcode = gtin14 });
    }

    [RequirePermission(Policies.RequireProductWrite)]
    [EnableRateLimiting(Policies.RequireProductWrite)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int productId, int id, CreateProductUnitConversionDto dto)
    {
        var conversion = await _context.ProductUnitConversions.FirstOrDefaultAsync(c => c.Id == id && c.ProductId == productId && !c.IsDeleted);
        if (conversion == null) return NotFound(new { message = "Çevrim bulunamadı." });
        conversion.ConversionFactor = dto.ConversionFactor;
        conversion.IsDefault = dto.IsDefault;
        if (dto.Barcode != conversion.Barcode)
        {
            conversion.Barcode = dto.Barcode;
            conversion.BarcodeType = stok_takip.Services.BarcodeTypeDetector.Detect(dto.Barcode);
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Çevrim güncellendi." });
    }
}
