namespace stok_takip.DTOs;

public class CreateLocationDto
{
    public string Code { get; set; } = string.Empty;
    public int WarehouseId { get; set; }
}