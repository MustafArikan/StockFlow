using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AttributeAllowedValue : BaseEntity
{
    public int AttributeRuleId { get; set; }
    
    [JsonIgnore]
    public AttributeRule? AttributeRule { get; set; }

    [Required]
    [MaxLength(200)]
    public string Value { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Label { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;
}
