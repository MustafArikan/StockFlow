using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class ProductSuppliersController : ControllerBase
{
    private readonly AppDbContext _context;
    public ProductSuppliersController(AppDbContext context) => _context = context;

    // ürüne tedarikçi bağla
     [HttpPost("products/{productId}/suppliers")]
     [RequirePermission(Policies.RequireProductSupplierWrite)]
     [EnableRateLimiting(Policies.RequireProductSupplierWrite)]
     public async Task<IActionResult> Link(int productId, [FromBody] CreateProductSupplierDto dto)
    {
        if (!await _context.Products.AnyAsync(p => p.Id == productId))
            return NotFound(new { message = "Ürün bulunamadı." });
        if (!await _context.Suppliers.AnyAsync(s => s.Id == dto.SupplierId))
            return NotFound(new { message = "Tedarikçi bulunamadı." });

        var mevcut = await _context.ProductSuppliers
            .FirstOrDefaultAsync(ps => ps.ProductId == productId && ps.SupplierId == dto.SupplierId);
        if (mevcut != null)
            return BadRequest(new { message = "Bu tedarikçi zaten bu ürüne bağlı." });

        var link = new ProductSupplier
        {
            ProductId = productId,
            SupplierId = dto.SupplierId,
            PurchasePrice = dto.PurchasePrice,
            SupplierProductCode = dto.SupplierProductCode,
            LeadTimeDays = dto.LeadTimeDays,
            IsPreferred = dto.IsPreferred
        };
        _context.ProductSuppliers.Add(link);
        await _context.SaveChangesAsync();
        return Ok(new {message = "Tedarikçi ürüne bağlandı.", id=link.Id});
    }

    [RequirePermission(Policies.RequireSupplierRead)]
    [HttpGet("products/{productId}/suppliers")]
    public async Task<IActionResult> GetSuppliersOfProduct(int productId)
    {
        var list = await _context.ProductSuppliers
            .AsNoTracking()
            .Where(ps => ps.ProductId == productId && !ps.Supplier.IsDeleted)
            .Select(ps => new ProductSupplierResponseDto(ps.Id, ps.SupplierId, ps.Supplier.Name, ps.PurchasePrice, ps.SupplierProductCode, ps.LeadTimeDays, ps.IsPreferred))
            .ToListAsync();
        return Ok(list);
    }

    [RequirePermission(Policies.RequireSupplierRead)]
    [HttpGet("suppliers/{supplierId}/products")]
    public async Task<IActionResult> GetProductsOfSupplier(int supplierId)
    {
        var list = await _context.ProductSuppliers
            .AsNoTracking()
            .Where(ps => ps.SupplierId == supplierId && !ps.Product.IsDeleted)
            .Select(ps => new SupplierProductResponseDto(ps.Id, ps.ProductId, ps.Product.Name, ps.Product.Barcode, ps.PurchasePrice, ps.IsPreferred ))
            .ToListAsync();
        return Ok(list);
    }

    // DELETE tedarikçiye bağlı ürünü silme
    [HttpDelete("products/{productId}/suppliers/{supplierId}")]
    [RequirePermission(Policies.RequireProductSupplierWrite)]
    [EnableRateLimiting(Policies.RequireProductSupplierWrite)] 
    public async Task<IActionResult> Delete(int productId, int supplierId)
    {
        var productSupplier = await _context.ProductSuppliers.FirstOrDefaultAsync(ps => ps.ProductId == productId && ps.SupplierId == supplierId);
        if(productSupplier == null)
            return NotFound();
        
        productSupplier.IsDeleted = true;
        await _context.SaveChangesAsync();
        return NoContent();
    }


}
