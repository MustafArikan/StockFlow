using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateAssetDto
{
    [Required(ErrorMessage = "Hangi ürün modeline ait olduğunu belirtmelisiniz.")]
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir ürün seçilmelidir.")]
    public int ProductId { get; set; }

    [Required(ErrorMessage = "Seri numarası (QR/Barkod) zorunludur.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Seri numarası 1-100 karakter olmalıdır.")]
    [RegularExpression(@"^[a-zA-Z0-9-]+$", ErrorMessage = "Seri numarası sadece harf, rakam ve tire içerebilir.")]
    public string SerialNumber { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public string? Attributes { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir raf seçilmelidir.")]
    public int LocationId { get; set; }

    public int? AssignedUserId { get; set; }
}