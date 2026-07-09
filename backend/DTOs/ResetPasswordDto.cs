using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Reset code is required.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Reset code must be exactly 6 characters long.")]
        public string ResetCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 100 characters long.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
