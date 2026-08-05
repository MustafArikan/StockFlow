using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class CreateAssetDto
{
    [Required(ErrorMessage = "Hangi ürün modeline ait olduğunu belirtmelisiniz.")]
    public int ProductId { get; set; }

    [Required(ErrorMessage = "Seri numarası (QR/Barkod) zorunludur.")]
    public string SerialNumber { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public string? Attributes { get; set; }

    public int LocationId { get; set; }
}