namespace backend.Models
{
    public class AssetHistory
    {
        public int Id { get; set; }
        public int AssetId { get; set; }
        public Asset? Asset { get; set; }
        public int? UserId { get; set; }
        public User? User { get; set; }
        public int? AssignedById { get; set; }
        public User? AssignedBy { get; set; }
        public string ActionType { get; set; } = "assign"; // assign, return, maintenance_start, maintenance_end, retire
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
