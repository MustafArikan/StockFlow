namespace stok_takip.DTOs;

public class ProductDto
{
    public int Id{ get; set;}
    public string Name { get; set;}=string.Empty;
    public string Barcode { get; set;}=string.Empty;
    public int MinStockLevel {  get; set;}
    public int CategoryId {get; set;}
    public string CategoryName { get; set;} = string.Empty;
}