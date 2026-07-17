using System.Text.Json.Serialization;
namespace stok_takip.Models;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public int? ParentId { get; set; } // Self FK
    public Category? Parent { get; set; }

    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    
    public ICollection<Product> Products { get; set; } = new List<Product>();   

    public ICollection<AttributeRule> AttributeRules { get; set; } = new List<AttributeRule>();
}
