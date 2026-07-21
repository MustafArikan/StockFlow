using System.Text.Json.Serialization;
namespace stok_takip.Models;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer"; // admin, operator, viewer ...
    public bool IsEmailConfirmed { get; set; } = false;
    public string? EmailConfirmationCode { get; set; }
    public DateTime? ConfirmationCodeExpiry { get; set; }
    public string? PasswordResetCode { get; set; }
    public DateTime? PasswordResetCodeExpiry { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LastFailedLoginAttempt { get; set; } // null ise not lockedd
    public ICollection<UserWarehouse> UserWarehouses { get; set; } = new List<UserWarehouse>();
    public ICollection<AssetHistory> AssetHistories { get; set; } = new List<AssetHistory>();
    public ICollection<SecurityAuditLog> SecurityAuditLogs { get; set; } = new List<SecurityAuditLog>();
}
