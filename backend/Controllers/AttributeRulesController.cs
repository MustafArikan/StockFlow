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
        var targetCategoryIds = new List<int?>();

        targetCategoryIds.Add(null);

        int? currentId = categoryId;

        while (currentId.HasValue)
        {
            targetCategoryIds.Add(currentId.Value);
            var category = await _context.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == currentId.Value);

            if (category == null)
            {
                break; // Kategori bulunamazsa döngüyü kır
            } 

            currentId = category.ParentId;
        }
            var rules = await _context.AttributeRules
                .AsNoTracking()
                .Where(a => targetCategoryIds.Contains(a.CategoryId) && !a.IsDeleted)
                .OrderBy(a => a.DisplayOrder)
                .Select(rule => new stok_takip.DTOs.AttributeRuleResponseDto(
                    rule.Id,
                    rule.CategoryId,
                    rule.AttributeKey,
                    rule.DataType,
                    rule.IsRequired,
                    rule.AllowedValues,
                    rule.UiComponent,
                    rule.MinValue,
                    rule.MaxValue,
                    rule.TargetLevel,
                    rule.DisplayOrder))
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
            AllowedValues = dto.AllowedValues,
            UiComponent = dto.UiComponent,
            MinValue = dto.MinValue,
            MaxValue = dto.MaxValue,
            TargetLevel = dto.TargetLevel
        };

        _context.AttributeRules.Add(rule);
        await _context.SaveChangesAsync();
        return Ok(new stok_takip.DTOs.AttributeRuleResponseDto(rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, rule.AllowedValues, rule.UiComponent, rule.MinValue, rule.MaxValue, rule.TargetLevel, rule.DisplayOrder));
    }

    // Kural güncelleme
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] stok_takip.DTOs.CreateAttributeRuleDto dto)
    {
        var rule = await _context.AttributeRules.FindAsync(id);
        if (rule == null || rule.IsDeleted)
            return NotFound(new { message = "Kural bulunamadı." });

        rule.AttributeKey = dto.AttributeKey;
        rule.DataType = dto.DataType;
        rule.IsRequired = dto.IsRequired;
        rule.AllowedValues = dto.AllowedValues;
        rule.UiComponent = dto.UiComponent;
        rule.MinValue = dto.MinValue;
        rule.MaxValue = dto.MaxValue;
        rule.TargetLevel = dto.TargetLevel;

        await _context.SaveChangesAsync();
        return Ok(new stok_takip.DTOs.AttributeRuleResponseDto(rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, rule.AllowedValues, rule.UiComponent, rule.MinValue, rule.MaxValue, rule.TargetLevel, rule.DisplayOrder));
    }

    // Kural silme (Soft Delete)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rule = await _context.AttributeRules.FindAsync(id);
        if (rule == null)
            return NotFound(new { message = "Kural bulunamadı." });

        rule.IsDeleted = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Kural başarıyla silindi." });
    }

    // Kural sıralamasını güncelleme
    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<stok_takip.DTOs.UpdateRuleOrderDto> dtos)
    {
        if (dtos == null || !dtos.Any()) return BadRequest(new { message = "Geçersiz sıralama verisi." });

        var ruleIds = dtos.Select(d => d.Id).ToList();
        var rules = await _context.AttributeRules.Where(r => ruleIds.Contains(r.Id)).ToListAsync();

        foreach (var rule in rules)
        {
            var dto = dtos.FirstOrDefault(d => d.Id == rule.Id);
            if (dto != null)
            {
                rule.DisplayOrder = dto.DisplayOrder;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Sıralama başarıyla güncellendi." });
    }
}
