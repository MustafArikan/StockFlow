using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

}

public class ResetPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength =6)]
    public string ResetCode { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required]
    public string OldPassword { get; set; } = string.Empty;
    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}

