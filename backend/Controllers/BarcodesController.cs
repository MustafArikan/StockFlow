using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.Services;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/barcodes")]
[Authorize]
public class BarcodesController : ControllerBase
{
    private readonly AppDbContext _context;
    public BarcodesController(AppDbContext context) => _context = context;

    public class ResolveRequest { public string RawCode { get; set; } = string.Empty; public string? SymbologyFormat { get; set; } }

    [HttpPost("resolve")]
    public async Task<IActionResult> Resolve(ResolveRequest req)
    {
        var raw = req.RawCode?.Trim() ?? "";
        if (string.IsNullOrEmpty(raw)) return BadRequest(new { message = "Boş barkod." });

        if (raw.StartsWith("]C1")) raw = raw.Substring(3);
        string normalized = raw.Replace("(", "").Replace(")", "");

        // 1) CODE_128 formatı ve GS1 AI deseniyle başlıyorsa (01, 00 gibi) veya sadece 01/00 ile başlıyorsa ve uzunsa -> GS1-128 olarak ayrıştır
        bool looksLikeGs1 = (req.SymbologyFormat?.Contains("128", StringComparison.OrdinalIgnoreCase) == true || normalized.Length > 14)
                             && (normalized.StartsWith("01") || normalized.StartsWith("00"));

        if (looksLikeGs1)
        {
            var parsed = Gs1BarcodeParser.Parse(raw);
            if (parsed.Sscc != null)
                return Ok(new { kind = "pallet", sscc = parsed.Sscc });

            if (parsed.Gtin != null)
            {
                var product = await FindProductByAnyBarcode(parsed.Gtin);
                if (product == null) return NotFound(new { message = "GTIN sistemde tanımlı değil." });

                return Ok(new
                {
                    kind = "product_with_batch",
                    productId = product.Id,
                    lotNumber = parsed.LotNumber,
                    expiryDate = parsed.ExpiryDate,
                    variableQuantity = parsed.VariableQuantity,
                    netWeightKg = parsed.NetWeightKg
                });
            }
        }

        var directProduct = await FindProductByAnyBarcode(raw);
        if (directProduct != null)
            return Ok(new { kind = "product", productId = directProduct.Id, matchedBarcode = raw });

        var conversion = await _context.ProductUnitConversions
            .Include(c => c.AlternativeUnit)
            .FirstOrDefaultAsync(c => c.Barcode == raw && !c.IsDeleted);
        if (conversion != null)
            return Ok(new
            {
                kind = "product_packaging",
                productId = conversion.ProductId,
                inputUnitId = conversion.AlternativeUnitId,
                unitShortCode = conversion.AlternativeUnit.ShortCode,
                suggestedQuantity = 1
            });

        return NotFound(new { message = "Barkod sistemde tanımlı değil." });
    }

    private async Task<Product?> FindProductByAnyBarcode(string code)
    {
        var trimmedCode = code.TrimStart('0');
        return await _context.Products.FirstOrDefaultAsync(p => (p.Barcode == code || p.Barcode == trimmedCode) && !p.IsDeleted);
    }
}
