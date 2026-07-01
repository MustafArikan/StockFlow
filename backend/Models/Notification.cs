namespace stok_takip.Models;

public class Notification : BaseEntity
{
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "CRITICAL_STOCK";
    public string Severity { get; set; } = "WARNING";  // WARNING (SARI), CRITICAL (TURUNCU), DANGER (KIRMIZI)
    public bool IsRead { get; set; } = false;
}