using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using stok_takip.DTOs;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Microsoft.AspNetCore.Http.HttpResults;



namespace stok_takip.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize] // Tüm eylemler için yetkilendirme gerektirir

public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;
    
    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/categories : tüm kategorileri listele
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Categories.AsNoTracking();
        var totalRecords = await query.CountAsync();

        var categories = await query
            .OrderByDescending(c => c.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new 
        {
            items = categories,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }


    // POST /api/categories : yeni kategori ekle
    [HttpPost]
    [Authorize(Roles = "admin")] // Sadece Admin rolüne sahip kullanıcılar kategori ekleyebilir
    public async Task<IActionResult> Create(CreateCategoryDto dto)
    {
        var mevcut = await _context.Categories.FirstOrDefaultAsync(c=> c.Name == dto.Name);

        if (mevcut != null)
        {
            return BadRequest("Bu isimde bir kateori zaten var.");
        }
        
        
        var category = new Category
        {
            Name = dto.Name,
            ParentId = dto.ParentId
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")] // Sadece Admin rolüne sahip kullanıcılar kategori silebilir
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category== null)
        return NotFound();

        category.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }


    // PUT /api/categories/5 : kategori güncelle
    [HttpPut("{id}")]
    [Authorize(Roles = "admin")] // Sadece Admin rolüne sahip kullanıcılar kategori güncelleyebilir
    public async Task<IActionResult> Update(int id, CreateCategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);
        if(category == null)
            return NotFound();

        var mecvut = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.Name && c.Id != id);
        if (mecvut != null)
        {
            return BadRequest("Bu isimde bir kategori zaten var.");
        }

        category.Name = dto.Name;
        category.ParentId = dto.ParentId;

        await _context.SaveChangesAsync();
        return Ok(category);
    }


}