using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateProductDto
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

    [Range(0, double.MaxValue, ErrorMessage = "Maliyet fiyatı negatif olamaz.")]
    public decimal Cost { get; set; } = 0; 

    [Range(0, double.MaxValue, ErrorMessage = "Çıkış fiyatı negatif olamaz.")]
    public decimal Price { get; set; } = 0;

    // YENİ: Depodan doğrudan ekleme yaptığımız için hedef raf/lokasyon zorunlu
    [Required(ErrorMessage = "Ürünün yerleştirileceği raf/lokasyon seçilmelidir.")]
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir raf seçilmelidir.")]
    public int TargetLocationId { get; set; }

    // YENİ: Başlangıç stok miktarı (Negatif olamaz, varsayılan 0 olabilir)
    [Range(0, int.MaxValue, ErrorMessage = "Başlangıç stok adedi negatif olamaz.")]
    public int InitialQuantity { get; set; }
    public int LocationId { get; set; }

    public List<ProductAttributeDto>? Attributes { get; set; } // JSON formatında ürün özellikleri (Strongly Typed EAV)
}

public class ProductAttributeDto
{
    public int RuleId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
