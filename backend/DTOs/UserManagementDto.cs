using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class CreateUserDto
    {
    [Required(ErrorMessage = "First name is required.")]
    [StringLength(50)]
    [RegularExpression(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$", ErrorMessage = "İsim sadece harf içerebilir.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required.")]
    [StringLength(50)]
    [RegularExpression(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$", ErrorMessage = "İsim sadece harf içerebilir.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.")]
    public string Password { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }
    [RegularExpression(@"^[1-9][0-9]{10}$", ErrorMessage = "TC Kimlik No 11 haneli olmalı ve 0 ile başlamamalıdır.")]
    public string? IdentityNumber { get; set; }

    [Required]
    public int RoleId { get; set; }
    }

    public class UpdateUserDto
    {
        [Required(ErrorMessage = "First name is required.")]
        [StringLength(50)]
        [RegularExpression(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$", ErrorMessage = "İsim sadece harf içerebilir.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(50)]
        [RegularExpression(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$", ErrorMessage = "İsim sadece harf içerebilir.")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
        [RegularExpression(@"^[1-9][0-9]{10}$", ErrorMessage = "TC Kimlik No 11 haneli olmalı ve 0 ile başlamamalıdır.")]
        public string? IdentityNumber { get; set; }

        [Required]
        public int RoleId { get; set; }

        // Şifre boş bırakılırsa güncellenmeyecek
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.")]
        public string? Password { get; set; }
    }
}