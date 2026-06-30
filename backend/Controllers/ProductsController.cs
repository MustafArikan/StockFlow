using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/products")]
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
        var products = await _context.Products.ToListAsync();
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
    public async Task<IActionResult> Update(int id, Product updated)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        product.Name = updated.Name;
        product.Barcode = updated.Barcode;
        product.MinStockLevel = updated.MinStockLevel;
        product.CategoryId = updated.CategoryId;

        await _context.SaveChangesAsync();
        return Ok(product);
        
    }

    // DELETE /api/products/5 : ürünü sil
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return NoContent();
    }

}
