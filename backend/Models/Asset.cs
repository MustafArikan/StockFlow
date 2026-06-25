namespace backend.Models
{
    public class Asset
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public string QrCode { get; set; } = string.Empty;
        public string Status { get; set; } = "available"; // available, assigned, maintenance, retired
        public int? AssignedToUserId { get; set; }
        public User? AssignedToUser { get; set; }
        public string? AssignedToName { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? WarrantyExpiration { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
