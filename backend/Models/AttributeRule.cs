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

    public string? AllowedValues { get; set; }

}
