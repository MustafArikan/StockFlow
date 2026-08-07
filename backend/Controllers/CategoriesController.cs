using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
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
    [RequirePermission(Policies.RequireCategoryRead)]
    [HttpGet]
    [NormalizePagination]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Categories.AsNoTracking();
        var totalRecords = await query.CountAsync();

        var categories = await query
            .Include(c => c.Parent)
            .OrderByDescending(c => c.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.ParentId,
                ParentName = c.Parent != null ? c.Parent.Name : "Ana Kategori"
            })
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
    [RequirePermission(Policies.RequireCategoryWrite)]
    [EnableRateLimiting(Policies.RequireCategoryWrite)] // Sadece Admin rolüne sahip kullanıcılar kategori ekleyebilir
    public async Task<IActionResult> Create(CreateCategoryDto dto)
    {
        var mevcut = await _context.Categories.FirstOrDefaultAsync(c=> c.Name == dto.Name);

        if (mevcut != null)
        {
            return BadRequest(new { message = "Bu isimde bir kateori zaten var." });
        }
        
        if (dto.ParentId.HasValue)
        {
            var parentExists = await _context.Categories.AnyAsync(c => c.Id == dto.ParentId.Value && !c.IsDeleted);
            if (!parentExists)
                return BadRequest(new { message = "Belirtilen üst kategori bulunamadı." });
        }
        
        var category = new Category
        {
            Name = dto.Name,
            ParentId = dto.ParentId
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(new CategoryResponseDto(category.Id, category.Name, category.ParentId));
    }

    [RequirePermission(Policies.RequireCategoryRead)]
    [HttpGet("{id}/check-dependencies")]
    public async Task<IActionResult> CheckDependencies(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        // Tüm aktif kategorileri belleğe alıp hiyerarşik alt kategorileri (recursive) bulalım
        var allCategories = await _context.Categories.Where(c => !c.IsDeleted).ToListAsync();
        var descendantIds = new HashSet<int> { id };
        
        bool addedNew;
        do
        {
            addedNew = false;
            foreach (var c in allCategories)
            {
                if (c.ParentId.HasValue && descendantIds.Contains(c.ParentId.Value) && !descendantIds.Contains(c.Id))
                {
                    descendantIds.Add(c.Id);
                    addedNew = true;
                }
            }
        } while (addedNew);

        var subCategoryCount = descendantIds.Count - 1; // Kendisi hariç

        var products = await _context.Products
            .AsNoTracking()
            .Where(p => descendantIds.Contains(p.CategoryId) && !p.IsDeleted)
            .Select(p => new {
                Name = p.Name,
                Stock = p.StockLevels.Where(sl => !sl.IsDeleted).Sum(sl => (int?)sl.Quantity) ?? 0
            })
            .ToListAsync();

        return Ok(new {
            hasDependencies = products.Any() || subCategoryCount > 0,
            hasProducts = products.Any(),
            productCount = products.Count,
            subCategoryCount = subCategoryCount,
            products = products
        });
    }

    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireCategoryWrite)]
    [EnableRateLimiting(Policies.RequireCategoryWrite)] // Sadece Admin rolüne sahip kullanıcılar kategori silebilir
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category== null)
        return NotFound();

        var hasChildren = await _context.Categories.AnyAsync(c => c.ParentId == id && !c.IsDeleted);
        var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id && !p.IsDeleted);
        if (hasChildren || hasProducts)
            return BadRequest(new { message = "Bu kategoriye bağlı ürün veya alt kategori var, silinemez." });

        category.IsDeleted = true; // Soft delete
        await _context.SaveChangesAsync();
        return NoContent();
    }


    // PUT /api/categories/5 : kategori güncelle
    [HttpPut("{id}")]
    [RequirePermission(Policies.RequireCategoryWrite)]
    [EnableRateLimiting(Policies.RequireCategoryWrite)] // Sadece Admin rolüne sahip kullanıcılar kategori güncelleyebilir
    public async Task<IActionResult> Update(int id, CreateCategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);
        if(category == null)
            return NotFound();

        var mecvut = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.Name && c.Id != id);
        if (mecvut != null)
        {
            return BadRequest(new { message = "Bu isimde bir kategori zaten var." });
        }

        if (dto.ParentId.HasValue && dto.ParentId.Value == id)
        {
            return BadRequest(new { message = "Bir kategori kendi kendisinin üst kategorisi olamaz." });
        }

        if (dto.ParentId.HasValue)
        {
            var parentExists = await _context.Categories.AnyAsync(c => c.Id == dto.ParentId.Value && !c.IsDeleted);
            if (!parentExists)
                return BadRequest(new { message = "Belirtilen üst kategori bulunamadı." });

            var currentParentId = dto.ParentId;
            while (currentParentId.HasValue)
            {
                if (currentParentId.Value == id)
                {
                    return BadRequest(new { message = "Sonsuz döngü tespit edildi. Bir Kategori kendi alt kategorisinin veya torununun altına taşınamaz." });
                }

                var parentCategory = await _context.Categories
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == currentParentId.Value);

                currentParentId = parentCategory?.ParentId;
            }
        }

        category.Name = dto.Name;
        category.ParentId = dto.ParentId;

        await _context.SaveChangesAsync();
        return Ok(new CategoryResponseDto(category.Id, category.Name, category.ParentId));
    }


}

