using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class GenerateSkuDto
{
    [Required]
    public int CategoryId { get; set; }
    
    public List<ProductAttributeDto> Attributes { get; set; } = new List<ProductAttributeDto>();
}
