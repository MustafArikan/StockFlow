using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using stok_takip.Models;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace stok_takip.Data;

public class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<Warehouse> Warehouses { get; set; } = null!;
    public DbSet<Location> Locations { get; set; } = null!;
    public DbSet<StockLevel> StockLevels { get; set; } = null!;
    public DbSet<StockMovement> StockMovements { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<UserSession> UserSessions { get; set; } = null!;
    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<AssetHistory> AssetHistories { get; set; } = null!;
    public DbSet<SecurityAuditLog> SecurityAuditLogs { get; set; } = null!;
    public DbSet<AttributeRule> AttributeRules { get; set; } = null!;
    public DbSet<Supplier> Suppliers { get; set; } = null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // GLOBAL QUERY FILTERS FOR SOFT DELETE
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Product>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Warehouse>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Location>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<StockLevel>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<StockMovement>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Notification>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Asset>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<AssetHistory>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<SecurityAuditLog>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<UserSession>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<AttributeRule>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => !e.IsDeleted);




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
            .IsUnique()
            .HasFilter("[is_deleted] = 0");
            
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Location>()
            .HasIndex(l => l.Code)
            .IsUnique();

        modelBuilder.Entity<StockLevel>()
            .HasIndex(sl => new { sl.ProductId, sl.LocationId })
            .IsUnique();
        
        modelBuilder.Entity<UserSession>()
            .HasIndex(s => s.SessionToken)
            .IsUnique();

        modelBuilder.Entity<Asset>()
            .HasIndex(a => a.SerialNumber)
            .IsUnique()
            .HasFilter("[is_deleted] = 0");

        modelBuilder.Entity<AssetHistory>()
            .HasOne(ah => ah.Asset)
            .WithMany(a => a.History)
            .HasForeignKey(ah => ah.AssetId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockMovement>()
            .HasOne(sm => sm.Product)
            .WithMany(p => p.StockMovements)
            .HasForeignKey(sm => sm.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AttributeRule>()
            .HasOne(a => a.Category)
            .WithMany(c => c.AttributeRules)
            .HasForeignKey(a => a.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Tedarikçi silinirse, geçmiş stok hareketleri bozulmasın
        modelBuilder.Entity<StockMovement>()
            .HasOne(sm => sm.Supplier)
            .WithMany(s => s.StockMovements)
            .HasForeignKey(sm => sm.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

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
        return startUnderscore + Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLowerInvariant();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = new List<SecurityAuditLog>();

        int? currentUserId = null;
        if (_httpContextAccessor?.HttpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = _httpContextAccessor.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int uid))
            {
                currentUserId = uid;
            }
        }

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is SecurityAuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditLog = new SecurityAuditLog
            {
                EntityName = entry.Entity.GetType().Name,
                ActionType = entry.State.ToString(), // "Added", "Modified", "Deleted"
                UserId = currentUserId, // Operatörü Mühürle!
                IpAddress = _httpContextAccessor?.HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "127.0.0.1"
            };

            if (entry.State == EntityState.Modified)
            {
                var oldValues = new Dictionary<string, object?>();
                var newValues = new Dictionary<string, object?>();

                foreach (var property in entry.Properties)
                {
                    if (property.IsModified)
                    {
                        oldValues[property.Metadata.Name] = property.OriginalValue;
                        newValues[property.Metadata.Name] = property.CurrentValue;
                    }
                }
                auditLog.OldValues = JsonSerializer.Serialize(oldValues);
                auditLog.NewValues = JsonSerializer.Serialize(newValues);

                var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
                if (idProperty != null && idProperty.CurrentValue != null)
                {
                    auditLog.EntityId = (int)idProperty.CurrentValue;
                }
            }
            else if (entry.State == EntityState.Added)
            {
                var newValues = new Dictionary<string, object?>();
                foreach (var property in entry.Properties)
                {
                    newValues[property.Metadata.Name] = property.CurrentValue;
                }
                auditLog.NewValues = JsonSerializer.Serialize(newValues);
            }
            else if (entry.State == EntityState.Deleted)
            {
                var oldValues = new Dictionary<string, object?>();
                foreach (var property in entry.Properties)
                {
                    oldValues[property.Metadata.Name] = property.OriginalValue;
                }
                auditLog.OldValues = JsonSerializer.Serialize(oldValues);

                var idProperty = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
                if (idProperty != null && idProperty.OriginalValue != null)
                {
                    auditLog.EntityId = (int)idProperty.OriginalValue;
                }
            }

            auditEntries.Add(auditLog);
        }

        if (auditEntries.Any())
        {
            SecurityAuditLogs.AddRange(auditEntries);
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
