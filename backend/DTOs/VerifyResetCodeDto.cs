using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class VerifyResetCodeDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Reset code is required.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Reset code must be exactly 6 characters long.")]
        public string ResetCode { get; set; } = string.Empty;
    }
}
