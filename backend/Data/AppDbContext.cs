using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<StockLevel> StockLevels { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        
        // Option 1: QR & Asset Zimmet
        public DbSet<Asset> Assets { get; set; }
        public DbSet<AssetHistory> AssetHistories { get; set; }

        // Option 3: Security & PM
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<KanbanTask> KanbanTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
