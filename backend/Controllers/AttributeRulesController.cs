using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/attribute-rules")]
[Authorize]
public class AttributeRulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttributeRulesController(AppDbContext context)
    {
        _context = context;
    }

    // Belirli bir kategoriye ait kuralları getir
    [HttpGet("category/{categoryId}")]
    public async Task<IActionResult> GetByCategory(int categoryId)
    {
        var rules = await _context.AttributeRules
            .AsNoTracking()
            .Where(a => a.CategoryId == categoryId && !a.IsDeleted)
            .Select(rule => new stok_takip.DTOs.AttributeRuleResponseDto(rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, rule.AllowedValues))
            .ToListAsync();

        return Ok(rules);
    }

    // Kategoriye yeni bir kural ekle
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] stok_takip.DTOs.CreateAttributeRuleDto dto)
    {
        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId.Value);
            if (!categoryExists)
                return NotFound(new { message = "Kategori bulunamadı." });
        }

        var rule = new AttributeRule
        {
            CategoryId = dto.CategoryId,
            AttributeKey = dto.AttributeKey,
            DataType = dto.DataType,
            IsRequired = dto.IsRequired,
            AllowedValues = dto.AllowedValues
        };

        _context.AttributeRules.Add(rule);
        await _context.SaveChangesAsync();
        return Ok(new stok_takip.DTOs.AttributeRuleResponseDto(rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, rule.AllowedValues));
    }
}
