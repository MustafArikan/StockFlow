using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class UpdateProfileDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    [RegularExpression(@"^[1-9][0-9]{10}$", ErrorMessage = "TC Kimlik No 11 haneli olmalı ve 0 ile başlamamalıdır.")]
    public string? IdentityNumber { get; set; }
}