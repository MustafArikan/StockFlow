using System.Text.Json.Serialization;
namespace stok_takip.Models;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(11)]
    public string? IdentityNumber { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public AppRole Role { get; set; } = null!;
    public bool IsEmailConfirmed { get; set; } = false;
    public string? EmailConfirmationCode { get; set; }
    public DateTime? ConfirmationCodeExpiry { get; set; }
    public string? PasswordResetCode { get; set; }
    public DateTime? PasswordResetCodeExpiry { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LastFailedLoginAttempt { get; set; } // null ise not locked

    public int FailedVerificationAttempts { get; set; } = 0;
    public DateTime? LastFailedVerificationAttempt { get; set; }

    public int FailedPasswordResetAttempts { get; set; } = 0;
    public DateTime? LastFailedPasswordResetAttempt { get; set; }
    public ICollection<UserWarehouse> UserWarehouses { get; set; } = new List<UserWarehouse>();
    public ICollection<AssetHistory> AssetHistories { get; set; } = new List<AssetHistory>();
    public ICollection<SecurityAuditLog> SecurityAuditLogs { get; set; } = new List<SecurityAuditLog>();
}
