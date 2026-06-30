using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixLocaleSnakeCase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_asset_products_product_ıd",
                table: "asset");

            migrationBuilder.DropForeignKey(
                name: "fk_asset_history_users_user_ıd",
                table: "asset_history");

            migrationBuilder.DropForeignKey(
                name: "fk_categories_categories_parent_ıd",
                table: "categories");

            migrationBuilder.DropForeignKey(
                name: "fk_locations_warehouses_warehouse_ıd",
                table: "locations");

            migrationBuilder.DropForeignKey(
                name: "fk_products_categories_category_ıd",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "fk_security_audit_log_users_user_ıd",
                table: "security_audit_log");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_levels_locations_location_ıd",
                table: "stock_levels");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_levels_products_product_ıd",
                table: "stock_levels");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_products_product_ıd",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "fk_user_warehouse_users_user_ıd",
                table: "user_warehouse");

            migrationBuilder.DropForeignKey(
                name: "fk_user_warehouse_warehouses_warehouse_ıd",
                table: "user_warehouse");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "warehouses",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "ıs_email_confirmed",
                table: "users",
                newName: "is_email_confirmed");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "users",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_users_email",
                table: "users",
                newName: "ix_users_email");

            migrationBuilder.RenameColumn(
                name: "warehouse_ıd",
                table: "user_warehouse",
                newName: "warehouse_id");

            migrationBuilder.RenameColumn(
                name: "user_ıd",
                table: "user_warehouse",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "user_warehouse",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_user_warehouse_warehouse_ıd",
                table: "user_warehouse",
                newName: "ix_user_warehouse_warehouse_id");

            migrationBuilder.RenameIndex(
                name: "ıx_user_warehouse_user_ıd",
                table: "user_warehouse",
                newName: "ix_user_warehouse_user_id");

            migrationBuilder.RenameColumn(
                name: "product_ıd",
                table: "stock_movements",
                newName: "product_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "stock_movements",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_stock_movements_product_ıd",
                table: "stock_movements",
                newName: "ix_stock_movements_product_id");

            migrationBuilder.RenameColumn(
                name: "product_ıd",
                table: "stock_levels",
                newName: "product_id");

            migrationBuilder.RenameColumn(
                name: "location_ıd",
                table: "stock_levels",
                newName: "location_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "stock_levels",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_stock_levels_product_ıd_location_ıd",
                table: "stock_levels",
                newName: "ix_stock_levels_product_id_location_id");

            migrationBuilder.RenameIndex(
                name: "ıx_stock_levels_location_ıd",
                table: "stock_levels",
                newName: "ix_stock_levels_location_id");

            migrationBuilder.RenameColumn(
                name: "user_ıd",
                table: "security_audit_log",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "security_audit_log",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_security_audit_log_user_ıd",
                table: "security_audit_log",
                newName: "ix_security_audit_log_user_id");

            migrationBuilder.RenameColumn(
                name: "category_ıd",
                table: "products",
                newName: "category_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "products",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_products_category_ıd",
                table: "products",
                newName: "ix_products_category_id");

            migrationBuilder.RenameIndex(
                name: "ıx_products_barcode",
                table: "products",
                newName: "ix_products_barcode");

            migrationBuilder.RenameColumn(
                name: "ıs_read",
                table: "notifications",
                newName: "is_read");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "notifications",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "warehouse_ıd",
                table: "locations",
                newName: "warehouse_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "locations",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_locations_warehouse_ıd",
                table: "locations",
                newName: "ix_locations_warehouse_id");

            migrationBuilder.RenameIndex(
                name: "ıx_locations_code",
                table: "locations",
                newName: "ix_locations_code");

            migrationBuilder.RenameColumn(
                name: "parent_ıd",
                table: "categories",
                newName: "parent_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "categories",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_categories_parent_ıd",
                table: "categories",
                newName: "ix_categories_parent_id");

            migrationBuilder.RenameColumn(
                name: "user_ıd",
                table: "asset_history",
                newName: "user_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "asset_history",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_asset_history_user_ıd",
                table: "asset_history",
                newName: "ix_asset_history_user_id");

            migrationBuilder.RenameColumn(
                name: "product_ıd",
                table: "asset",
                newName: "product_id");

            migrationBuilder.RenameColumn(
                name: "ıd",
                table: "asset",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "ıx_asset_product_ıd",
                table: "asset",
                newName: "ix_asset_product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_asset_products_product_id",
                table: "asset",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_asset_history_users_user_id",
                table: "asset_history",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_categories_categories_parent_id",
                table: "categories",
                column: "parent_id",
                principalTable: "categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_locations_warehouses_warehouse_id",
                table: "locations",
                column: "warehouse_id",
                principalTable: "warehouses",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_products_categories_category_id",
                table: "products",
                column: "category_id",
                principalTable: "categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_security_audit_log_users_user_id",
                table: "security_audit_log",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_stock_levels_locations_location_id",
                table: "stock_levels",
                column: "location_id",
                principalTable: "locations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_levels_products_product_id",
                table: "stock_levels",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_products_product_id",
                table: "stock_movements",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_user_warehouse_users_user_id",
                table: "user_warehouse",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_user_warehouse_warehouses_warehouse_id",
                table: "user_warehouse",
                column: "warehouse_id",
                principalTable: "warehouses",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_asset_products_product_id",
                table: "asset");

            migrationBuilder.DropForeignKey(
                name: "fk_asset_history_users_user_id",
                table: "asset_history");

            migrationBuilder.DropForeignKey(
                name: "fk_categories_categories_parent_id",
                table: "categories");

            migrationBuilder.DropForeignKey(
                name: "fk_locations_warehouses_warehouse_id",
                table: "locations");

            migrationBuilder.DropForeignKey(
                name: "fk_products_categories_category_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "fk_security_audit_log_users_user_id",
                table: "security_audit_log");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_levels_locations_location_id",
                table: "stock_levels");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_levels_products_product_id",
                table: "stock_levels");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_products_product_id",
                table: "stock_movements");

            migrationBuilder.DropForeignKey(
                name: "fk_user_warehouse_users_user_id",
                table: "user_warehouse");

            migrationBuilder.DropForeignKey(
                name: "fk_user_warehouse_warehouses_warehouse_id",
                table: "user_warehouse");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "warehouses",
                newName: "ıd");

            migrationBuilder.RenameColumn(
                name: "is_email_confirmed",
                table: "users",
                newName: "ıs_email_confirmed");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "users",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_users_email",
                table: "users",
                newName: "ıx_users_email");

            migrationBuilder.RenameColumn(
                name: "warehouse_id",
                table: "user_warehouse",
                newName: "warehouse_ıd");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "user_warehouse",
                newName: "user_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "user_warehouse",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_user_warehouse_warehouse_id",
                table: "user_warehouse",
                newName: "ıx_user_warehouse_warehouse_ıd");

            migrationBuilder.RenameIndex(
                name: "ix_user_warehouse_user_id",
                table: "user_warehouse",
                newName: "ıx_user_warehouse_user_ıd");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "stock_movements",
                newName: "product_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "stock_movements",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_stock_movements_product_id",
                table: "stock_movements",
                newName: "ıx_stock_movements_product_ıd");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "stock_levels",
                newName: "product_ıd");

            migrationBuilder.RenameColumn(
                name: "location_id",
                table: "stock_levels",
                newName: "location_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "stock_levels",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_stock_levels_product_id_location_id",
                table: "stock_levels",
                newName: "ıx_stock_levels_product_ıd_location_ıd");

            migrationBuilder.RenameIndex(
                name: "ix_stock_levels_location_id",
                table: "stock_levels",
                newName: "ıx_stock_levels_location_ıd");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "security_audit_log",
                newName: "user_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "security_audit_log",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_security_audit_log_user_id",
                table: "security_audit_log",
                newName: "ıx_security_audit_log_user_ıd");

            migrationBuilder.RenameColumn(
                name: "category_id",
                table: "products",
                newName: "category_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "products",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_products_category_id",
                table: "products",
                newName: "ıx_products_category_ıd");

            migrationBuilder.RenameIndex(
                name: "ix_products_barcode",
                table: "products",
                newName: "ıx_products_barcode");

            migrationBuilder.RenameColumn(
                name: "is_read",
                table: "notifications",
                newName: "ıs_read");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "notifications",
                newName: "ıd");

            migrationBuilder.RenameColumn(
                name: "warehouse_id",
                table: "locations",
                newName: "warehouse_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "locations",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_locations_warehouse_id",
                table: "locations",
                newName: "ıx_locations_warehouse_ıd");

            migrationBuilder.RenameIndex(
                name: "ix_locations_code",
                table: "locations",
                newName: "ıx_locations_code");

            migrationBuilder.RenameColumn(
                name: "parent_id",
                table: "categories",
                newName: "parent_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "categories",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_categories_parent_id",
                table: "categories",
                newName: "ıx_categories_parent_ıd");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "asset_history",
                newName: "user_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "asset_history",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_asset_history_user_id",
                table: "asset_history",
                newName: "ıx_asset_history_user_ıd");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "asset",
                newName: "product_ıd");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "asset",
                newName: "ıd");

            migrationBuilder.RenameIndex(
                name: "ix_asset_product_id",
                table: "asset",
                newName: "ıx_asset_product_ıd");

            migrationBuilder.AddForeignKey(
                name: "fk_asset_products_product_ıd",
                table: "asset",
                column: "product_ıd",
                principalTable: "products",
                principalColumn: "ıd");

            migrationBuilder.AddForeignKey(
                name: "fk_asset_history_users_user_ıd",
                table: "asset_history",
                column: "user_ıd",
                principalTable: "users",
                principalColumn: "ıd");

            migrationBuilder.AddForeignKey(
                name: "fk_categories_categories_parent_ıd",
                table: "categories",
                column: "parent_ıd",
                principalTable: "categories",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_locations_warehouses_warehouse_ıd",
                table: "locations",
                column: "warehouse_ıd",
                principalTable: "warehouses",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_products_categories_category_ıd",
                table: "products",
                column: "category_ıd",
                principalTable: "categories",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_security_audit_log_users_user_ıd",
                table: "security_audit_log",
                column: "user_ıd",
                principalTable: "users",
                principalColumn: "ıd");

            migrationBuilder.AddForeignKey(
                name: "fk_stock_levels_locations_location_ıd",
                table: "stock_levels",
                column: "location_ıd",
                principalTable: "locations",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_levels_products_product_ıd",
                table: "stock_levels",
                column: "product_ıd",
                principalTable: "products",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_products_product_ıd",
                table: "stock_movements",
                column: "product_ıd",
                principalTable: "products",
                principalColumn: "ıd",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_user_warehouse_users_user_ıd",
                table: "user_warehouse",
                column: "user_ıd",
                principalTable: "users",
                principalColumn: "ıd");

            migrationBuilder.AddForeignKey(
                name: "fk_user_warehouse_warehouses_warehouse_ıd",
                table: "user_warehouse",
                column: "warehouse_ıd",
                principalTable: "warehouses",
                principalColumn: "ıd");
        }
    }
}
