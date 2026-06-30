namespace stok_takip.DTOs;

public class CreateCategoryDto
{
    public string Name {get; set;} = string.Empty;
    public int? ParentId{get; set;}
}