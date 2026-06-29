namespace stok_takip.Models;

public class StockMovement : BaseEntity
{
    public int ProductId { get; set; }
    public string MovementType { get; set; } = string.Empty; // IN, OUT, TRANSFER
    public int Quantity { get; set; }
    public string? Description { get; set; }

    public Product Product { get; set; } = null!;
}