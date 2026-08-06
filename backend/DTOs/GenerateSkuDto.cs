using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class GenerateSkuDto
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir kategori seçilmelidir.")]
    public int CategoryId { get; set; }
    
    public List<ProductAttributeDto> Attributes { get; set; } = new List<ProductAttributeDto>();
}
