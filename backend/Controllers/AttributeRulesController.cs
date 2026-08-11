using Microsoft.AspNetCore.Authorization;
using stok_takip.Attributes;
using stok_takip.Constants;
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
    [RequirePermission(Policies.RequireCategoryRead)]
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
        var rulesFromDb = await _context.AttributeRules
            .Include(a => a.AttributeAllowedValues)
            .AsNoTracking()
            .Where(a => targetCategoryIds.Contains(a.CategoryId) && !a.IsDeleted)
            .OrderBy(a => a.DisplayOrder)
            .ToListAsync();

        var rules = rulesFromDb.Select(rule => new stok_takip.DTOs.AttributeRuleResponseDto(
            rule.Id,
            rule.CategoryId,
            rule.AttributeKey,
            rule.DataType,
            rule.IsRequired,
            System.Text.Json.JsonSerializer.Serialize(rule.AttributeAllowedValues.Where(v => !v.IsDeleted && v.IsActive).OrderBy(v => v.DisplayOrder).Select(v => v.Value)),
            rule.UiComponent,
            rule.MinValue,
            rule.MaxValue,
            rule.TargetLevel,
            rule.DisplayOrder,
            rule.IsFeatured,
            rule.AttributeAllowedValues.Where(v => !v.IsDeleted).OrderBy(v => v.DisplayOrder).Select(v => new stok_takip.DTOs.AttributeAllowedValueDto(v.Value, v.Label, v.DisplayOrder, v.IsActive)).ToList()))
        .ToList();

                return Ok(rules);
    }

    // Kategoriye yeni bir kural ekle
    [HttpPost]
    [RequirePermission(Policies.RequireCategoryWrite)]
    public async Task<IActionResult> Create([FromBody] stok_takip.DTOs.CreateAttributeRuleDto dto)
    {
        if (dto.MinValue.HasValue && dto.MaxValue.HasValue && dto.MinValue > dto.MaxValue)
            return BadRequest(new { message = "Minimum değer maksimum değerden büyük olamaz." });

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
            TargetLevel = dto.TargetLevel,
            IsFeatured = dto.IsFeatured
        };

        if (dto.AllowedValueList != null && dto.AllowedValueList.Any())
        {
            foreach (var val in dto.AllowedValueList)
            {
                rule.AttributeAllowedValues.Add(new AttributeAllowedValue
                {
                    Value = val.Value,
                    Label = val.Label,
                    DisplayOrder = val.DisplayOrder,
                    IsActive = val.IsActive
                });
            }
        }
        else if (!string.IsNullOrEmpty(dto.AllowedValues) && dto.AllowedValues != "[]")
        {
            try 
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(dto.AllowedValues);
                if (parsed != null)
                {
                    int order = 1;
                    foreach (var p in parsed)
                    {
                        rule.AttributeAllowedValues.Add(new AttributeAllowedValue { Value = p, Label = p, DisplayOrder = order++ });
                    }
                }
            } 
            catch
            {
                var parts = dto.AllowedValues.Split(new[] {','}, StringSplitOptions.RemoveEmptyEntries);
                int order = 1;
                foreach (var p in parts)
                {
                    rule.AttributeAllowedValues.Add(new AttributeAllowedValue { Value = p.Trim(), Label = p.Trim(), DisplayOrder = order++ });
                }
            }
        }

        _context.AttributeRules.Add(rule);
        await _context.SaveChangesAsync();
        
        var responseDto = new stok_takip.DTOs.AttributeRuleResponseDto(
            rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, 
            System.Text.Json.JsonSerializer.Serialize(rule.AttributeAllowedValues.Where(v => !v.IsDeleted && v.IsActive).OrderBy(v => v.DisplayOrder).Select(x => x.Value)), 
            rule.UiComponent, rule.MinValue, rule.MaxValue, rule.TargetLevel, rule.DisplayOrder, rule.IsFeatured, 
            rule.AttributeAllowedValues.Where(v => !v.IsDeleted).OrderBy(v => v.DisplayOrder).Select(v => new stok_takip.DTOs.AttributeAllowedValueDto(v.Value, v.Label, v.DisplayOrder, v.IsActive)).ToList());
        return Ok(responseDto);
    }

    // Kural güncelleme
    [HttpPut("{id}")]
    [RequirePermission(Policies.RequireCategoryWrite)]
    public async Task<IActionResult> Update(int id, [FromBody] stok_takip.DTOs.CreateAttributeRuleDto dto)
    {
        if (dto.MinValue.HasValue && dto.MaxValue.HasValue && dto.MinValue > dto.MaxValue)
            return BadRequest(new { message = "Minimum değer maksimum değerden büyük olamaz." });

        var rule = await _context.AttributeRules
            .Include(r => r.AttributeAllowedValues)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (rule == null || rule.IsDeleted)
            return NotFound(new { message = "Kural bulunamadı." });

        rule.AttributeKey = dto.AttributeKey;
        rule.DataType = dto.DataType;
        rule.IsRequired = dto.IsRequired;
        rule.AllowedValues = dto.AllowedValues; // Keep original in DB for now
        rule.UiComponent = dto.UiComponent;
        rule.MinValue = dto.MinValue;
        rule.MaxValue = dto.MaxValue;
        rule.TargetLevel = dto.TargetLevel;
        rule.IsFeatured = dto.IsFeatured;

        // Gelen yeni değer listesini hazırla
        List<stok_takip.DTOs.AttributeAllowedValueDto> incomingList = new();
        if (dto.AllowedValueList != null)
        {
            incomingList = dto.AllowedValueList;
        }
        else if (!string.IsNullOrEmpty(dto.AllowedValues) && dto.AllowedValues != "[]")
        {
            try 
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<string>>(dto.AllowedValues);
                if (parsed != null)
                {
                    int i = 0;
                    incomingList = parsed.Select(p => new stok_takip.DTOs.AttributeAllowedValueDto(p, p, i++, true)).ToList();
                }
            } 
            catch
            {
                var parts = dto.AllowedValues.Split(new[] {','}, StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
                int i = 0;
                incomingList = parts.Select(p => new stok_takip.DTOs.AttributeAllowedValueDto(p, p, i++, true)).ToList();
            }
        }

        var incomingValues = incomingList.Select(x => x.Value).ToList();

        // 1. Veritabanında olup da yeni listede olmayanları SOFT DELETE yap (Silme)
        foreach (var existing in rule.AttributeAllowedValues)
        {
            if (!incomingValues.Contains(existing.Value))
            {
                existing.IsDeleted = true; // Sadece gizle, eski ürünlerdeki veriler patlamasın!
            }
            else
            {
                existing.IsDeleted = false; // Belki daha önce silinmişti, geri eklendi
            }
        }

        // 2. Yeni listedeki her öğeyi ekle veya güncelle (IsActive ve Label dahil)
        int order = 1;
        foreach (var incoming in incomingList)
        {
            var existing = rule.AttributeAllowedValues.FirstOrDefault(x => x.Value == incoming.Value);
            if (existing == null)
            {
                rule.AttributeAllowedValues.Add(new AttributeAllowedValue 
                { 
                    Value = incoming.Value, 
                    Label = incoming.Label ?? incoming.Value, 
                    DisplayOrder = order++,
                    IsActive = incoming.IsActive
                });
            }
            else
            {
                existing.DisplayOrder = order++;
                existing.Label = incoming.Label ?? existing.Label;
                existing.IsActive = incoming.IsActive;
            }
        }

        await _context.SaveChangesAsync();
        
        var responseDto = new stok_takip.DTOs.AttributeRuleResponseDto(
            rule.Id, rule.CategoryId, rule.AttributeKey, rule.DataType, rule.IsRequired, 
            System.Text.Json.JsonSerializer.Serialize(rule.AttributeAllowedValues.Where(v => !v.IsDeleted && v.IsActive).OrderBy(v => v.DisplayOrder).Select(x => x.Value)), 
            rule.UiComponent, rule.MinValue, rule.MaxValue, rule.TargetLevel, rule.DisplayOrder, rule.IsFeatured, 
            rule.AttributeAllowedValues.Where(v => !v.IsDeleted).OrderBy(v => v.DisplayOrder).Select(v => new stok_takip.DTOs.AttributeAllowedValueDto(v.Value, v.Label, v.DisplayOrder, v.IsActive)).ToList());
        return Ok(responseDto);
    }

    // Kural silme (Soft Delete)
    [HttpDelete("{id}")]
    [RequirePermission(Policies.RequireCategoryWrite)]
    public async Task<IActionResult> Delete(int id)
    {
        var rule = await _context.AttributeRules
            .Include(r => r.AttributeAllowedValues)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (rule == null)
            return NotFound(new { message = "Kural bulunamadı." });

        rule.IsDeleted = true;
        foreach (var val in rule.AttributeAllowedValues)
        {
            val.IsDeleted = true;
        }
        
        await _context.SaveChangesAsync();
        return Ok(new { message = "Kural başarıyla silindi." });
    }

    // Kural sıralamasını güncelleme
    [HttpPut("reorder")]
    [RequirePermission(Policies.RequireCategoryWrite)]
    public async Task<IActionResult> Reorder([FromBody] List<stok_takip.DTOs.UpdateRuleOrderDto> dtos)
    {
        if (dtos == null || !dtos.Any()) return BadRequest(new { message = "Geçersiz sıralama verisi." });

        var ruleIds = dtos.Select(d => d.Id).ToList();
        var rules = await _context.AttributeRules.Where(r => ruleIds.Contains(r.Id)).ToListAsync();

        if (rules.Select(r => r.CategoryId).Distinct().Count() > 1)
        {
            return BadRequest(new { message = "Farklı kategorilere ait kurallar aynı anda sıralanamaz." });
        }

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

