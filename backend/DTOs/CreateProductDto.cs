namespace stok_takip.DTOs;

public class CreateProductDto
{
    public string Name {get; set;} = string.Empty;
    public string Barcode {get; set;} = string.Empty;
    public int MinStockLevel {get; set;}
    public int CategoryId {get; set;}
}