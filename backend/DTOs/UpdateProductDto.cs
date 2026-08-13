using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UpdateProductDto
{
    [Required(ErrorMessage = "Ürün adı boş bırakılamaz.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Ürün adı en az 2, en fazla 100 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Barkod boş bırakılamaz.")]
    [RegularExpression(@"^[a-zA-Z0-9-]+$", ErrorMessage = "Barkod sadece harf, rakam ve tire içerebilir.")]
    public string Barcode { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Kritik stok seviyesi negatif olamaz.")]
    public int MinStockLevel { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir kategori seçilmelidir.")]
    public int CategoryId { get; set; }

    [Required(ErrorMessage = "Ürünün stok birimi seçilmelidir.")]
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir birim seçilmelidir.")]
    public int UnitId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Maliyet fiyatı negatif olamaz.")]
    public decimal Cost { get; set; } = 0;

    [Range(0, double.MaxValue, ErrorMessage = "Çıkış fiyatı negatif olamaz.")]  
    public decimal Price { get; set; } = 0;

    public List<ProductAttributeDto>? Attributes { get; set; } // JSON formatında ürün özellikleri (Strongly Typed EAV)
}
