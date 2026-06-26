using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using stok_takip.Models;

namespace stok_takip.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<Warehouse> Warehouses { get; set; } = null!;
    public DbSet<Location> Locations { get; set; } = null!;
    public DbSet<StockLevel> StockLevels { get; set; } = null!;
    public DbSet<StockMovement> StockMovements { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Category>()
            .HasOne(c => c.Parent)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Restrict); 

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Barcode)
            .IsUnique();

        modelBuilder.Entity<Location>()
            .HasIndex(l => l.Code)
            .IsUnique();

        modelBuilder.Entity<StockLevel>()
            .HasIndex(sl => new { sl.ProductId, sl.LocationId })
            .IsUnique();

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (tableName != null)
            {
                entity.SetTableName(ConvertToSnakeCase(tableName));
            }

            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ConvertToSnakeCase(property.Name));
            }

            foreach (var key in entity.GetKeys())
            {
                var keyName = key.GetName();
                if (keyName != null)
                {
                    key.SetName(ConvertToSnakeCase(keyName));
                }
            }

            foreach (var fk in entity.GetForeignKeys())
            {
                var constraintName = fk.GetConstraintName();
                if (constraintName != null)
                {
                    fk.SetConstraintName(ConvertToSnakeCase(constraintName));
                }
            }

            foreach (var index in entity.GetIndexes())
            {
                var indexName = index.GetDatabaseName();
                if (indexName != null)
                {
                    index.SetDatabaseName(ConvertToSnakeCase(indexName));
                }
            }
        }
    }

    private static string ConvertToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        
        var startUnderscore = Regex.Match(input, @"^_+");
        return startUnderscore + Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
    }
}