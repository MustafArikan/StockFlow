using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UpdateProfileDto
{
    [Required(ErrorMessage = "Ad boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2)]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Soyad boş bırakılamaz.")]
    [StringLength(50, MinimumLength = 2)]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "E-posta boş bırakılamaz.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }
    [RegularExpression(@"^[1-9][0-9]{10}$", ErrorMessage = "TC Kimlik No 11 haneli olmalı ve 0 ile başlamamalıdır.")]
    public string? IdentityNumber { get; set; }
}