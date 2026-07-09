using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;
    }
}
