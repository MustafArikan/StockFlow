using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateProductDto
{
    [Required(ErrorMessage = "ÃœrÃ¼n adÄ± boÅŸ bÄ±rakÄ±lamaz.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "ÃœrÃ¼n adÄ± en az 2, en fazla 100 karakter olabilir.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Barkod boÅŸ bÄ±rakÄ±lamaz.")]
    [RegularExpression(@"^[a-zA-Z0-9-]+$", ErrorMessage = "Barkod sadece harf, rakam ve tire iÃ§erebilir.")]
    public string Barcode { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Kritik stok seviyesi negatif olamaz.")]
    public int MinStockLevel { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "GeÃ§erli bir kategori seÃ§ilmelidir.")]
    public int CategoryId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Maliyet fiyatÄ± negatif olamaz.")]
    public decimal Cost { get; set; } = 0; 

    [Range(0, double.MaxValue, ErrorMessage = "Ã‡Ä±kÄ±ÅŸ fiyatÄ± negatif olamaz.")]
    public decimal Price { get; set; } = 0;

    // ğŸ¯ YENÄ°: Depodan doÄŸrudan ekleme yaptÄ±ÄŸÄ±mÄ±z iÃ§in hedef raf/lokasyon zorunlu
    [Required(ErrorMessage = "ÃœrÃ¼nÃ¼n yerleÅŸtirileceÄŸi raf/lokasyon seÃ§ilmelidir.")]
    [Range(1, int.MaxValue, ErrorMessage = "GeÃ§erli bir raf seÃ§ilmelidir.")]
    public int TargetLocationId { get; set; }

    // ğŸ¯ YENÄ°: BaÅŸlangÄ±Ã§ stok miktarÄ± (Negatif olamaz, varsayÄ±lan 0 olabilir)
    [Range(0, int.MaxValue, ErrorMessage = "BaÅŸlangÄ±Ã§ stok adedi negatif olamaz.")]
    public int InitialQuantity { get; set; }
    public int LocationId { get; set; }

    public List<ProductAttributeDto>? Attributes { get; set; } // JSON formatÄ±nda Ã¼rÃ¼n Ã¶zellikleri (Strongly Typed EAV)
}

public class ProductAttributeDto
{
    public int RuleId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

