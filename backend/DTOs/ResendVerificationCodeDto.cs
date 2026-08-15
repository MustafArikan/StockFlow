using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class ResendVerificationCodeDto
{
    [Required(ErrorMessage = "Email alanı zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    public string Email { get; set; } = null!;
}
