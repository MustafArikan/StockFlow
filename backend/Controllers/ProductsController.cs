using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/products")]
[Authorize] // Tüm eylemler için yetkilendirme gerektirir
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }
    // GET /api/products : tüm ürünleri listele
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Kategorileri veritabanından çekerek her ürünü sadece DTO'ya çevirir
        var products = await _context.Products
        .AsNoTracking()
        .Where(p => !p.IsDeleted) // Silinmiş ürünleri hariç tut
        .Include(p=>p.Category)
        .Select(p=> new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Barcode = p.Barcode,
            MinStockLevel = p.MinStockLevel,
            CategoryId = p.CategoryId,
            CategoryName = p.Category.Name,
            StockQuantity = p.StockLevels.Sum(sl => sl.Quantity) // Stok miktarını hesapla
        })
        .ToListAsync();
        return Ok(products);
    }

    //GET / api/products/5 : tek bir ürünü getir
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();
        return Ok(product);
    }

    // POST /api/products : yeni ürün ekle
    [HttpPost]
    public async Task<IActionResult> Create(CreateProductDto dto)
    {
        var mevcut = await _context.Products.FirstOrDefaultAsync(p => p.Name == dto.Name || p.Barcode == dto.Barcode);
        if (mevcut != null)
        {
            return BadRequest("Bu isim veya barkoda sahip bir ürün zaten var.");
        }    

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
        {
            return BadRequest("Belirtilen kategori bulunamadı.");
        }
        
        var product = new Product
        {
            Name = dto.Name,
            Barcode = dto.Barcode,
            MinStockLevel = dto.MinStockLevel,
            CategoryId = dto.CategoryId
        };
       
        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new{id = product.Id}, product);

    }

    // PUT /api/products/5 : mecvut ürünü güncelle 
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        var mevcut = await _context.Products.FirstOrDefaultAsync(p => (p.Name == dto.Name || p.Barcode == dto.Barcode) && p.Id != id && !p.IsDeleted);
        if (mevcut != null)
        {
            return BadRequest("Bu isim veya barkoda sahip bir ürün zaten var.");
        }

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists)
        {
            return BadRequest("Belirtilen kategori bulunamadı.");
        }

        product.Name = dto.Name;
        product.Barcode = dto.Barcode;
        product.MinStockLevel = dto.MinStockLevel;
        product.CategoryId = dto.CategoryId;

        await _context.SaveChangesAsync();
        return Ok(product);
        
    } 

    // DELETE /api/products/5 : ürünü sil
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted)
            return NotFound();

        product.IsDeleted = true; // Soft delete

        await _context.SaveChangesAsync();
        return NoContent();
    }

}
