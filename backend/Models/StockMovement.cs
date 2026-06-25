namespace backend.Models
{
    public class StockMovement
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        public string MovementType { get; set; } = "IN"; // IN, OUT, TRANSFER
        public int Quantity { get; set; }
        public int? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }
        public int? LocationId { get; set; }
        public Location? Location { get; set; }
        public string? Notes { get; set; }
        public int? CreatedBy { get; set; }
        public User? Creator { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
