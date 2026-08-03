using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class AttributeRule : BaseEntity
{
    public int? CategoryId { get; set; }
    
    public Category? Category { get; set; }

    [Required]
    [MaxLength(100)]
    public string AttributeKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DataType { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = false;

    [Obsolete("Use AttributeAllowedValues instead. Preserved for backward compatibility.")]
    public string? AllowedValues { get; set; }

    [MaxLength(50)]
    public string UiComponent { get; set; } = "textbox"; // slider, select, radio, checkbox, toggle...

    public decimal? MinValue { get; set; }

    public decimal? MaxValue { get; set; }

    [MaxLength(20)]
    public string TargetLevel { get; set; } = "Product"; // "Product" or "Asset"

    public int DisplayOrder { get; set; } = 0;

    public ICollection<AttributeAllowedValue> AttributeAllowedValues { get; set; } = new List<AttributeAllowedValue>();
}
