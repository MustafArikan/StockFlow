using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class VerifyEmailDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Verification code is required.")]
        [RegularExpression(@"^\d{6}$", ErrorMessage = "Verification code must consist of exactly 6 digits.")]
        public string VerificationCode { get; set; } = string.Empty;
    }
}