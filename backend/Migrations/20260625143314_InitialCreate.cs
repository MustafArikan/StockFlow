using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    parent_ıd = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_categories", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_categories_categories_parent_ıd",
                        column: x => x.parent_ıd,
                        principalTable: "categories",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ıs_read = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notifications", x => x.ıd);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.ıd);
                });

            migrationBuilder.CreateTable(
                name: "warehouses",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    address = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_warehouses", x => x.ıd);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    barcode = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    min_stock_level = table.Column<int>(type: "int", nullable: false),
                    category_ıd = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_products", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_products_categories_category_ıd",
                        column: x => x.category_ıd,
                        principalTable: "categories",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_history",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_ıd = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asset_history", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_asset_history_users_user_ıd",
                        column: x => x.user_ıd,
                        principalTable: "users",
                        principalColumn: "ıd");
                });

            migrationBuilder.CreateTable(
                name: "security_audit_log",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_ıd = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_security_audit_log", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_security_audit_log_users_user_ıd",
                        column: x => x.user_ıd,
                        principalTable: "users",
                        principalColumn: "ıd");
                });

            migrationBuilder.CreateTable(
                name: "locations",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    warehouse_ıd = table.Column<int>(type: "int", nullable: false),
                    code = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_locations", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_locations_warehouses_warehouse_ıd",
                        column: x => x.warehouse_ıd,
                        principalTable: "warehouses",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_warehouse",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_ıd = table.Column<int>(type: "int", nullable: true),
                    warehouse_ıd = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_warehouse", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_user_warehouse_users_user_ıd",
                        column: x => x.user_ıd,
                        principalTable: "users",
                        principalColumn: "ıd");
                    table.ForeignKey(
                        name: "fk_user_warehouse_warehouses_warehouse_ıd",
                        column: x => x.warehouse_ıd,
                        principalTable: "warehouses",
                        principalColumn: "ıd");
                });

            migrationBuilder.CreateTable(
                name: "asset",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_ıd = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asset", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_asset_products_product_ıd",
                        column: x => x.product_ıd,
                        principalTable: "products",
                        principalColumn: "ıd");
                });

            migrationBuilder.CreateTable(
                name: "stock_movements",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_ıd = table.Column<int>(type: "int", nullable: false),
                    movement_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stock_movements", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_stock_movements_products_product_ıd",
                        column: x => x.product_ıd,
                        principalTable: "products",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stock_levels",
                columns: table => new
                {
                    ıd = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_ıd = table.Column<int>(type: "int", nullable: false),
                    location_ıd = table.Column<int>(type: "int", nullable: false),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stock_levels", x => x.ıd);
                    table.ForeignKey(
                        name: "fk_stock_levels_locations_location_ıd",
                        column: x => x.location_ıd,
                        principalTable: "locations",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_stock_levels_products_product_ıd",
                        column: x => x.product_ıd,
                        principalTable: "products",
                        principalColumn: "ıd",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ıx_asset_product_ıd",
                table: "asset",
                column: "product_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_asset_history_user_ıd",
                table: "asset_history",
                column: "user_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_categories_parent_ıd",
                table: "categories",
                column: "parent_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_locations_code",
                table: "locations",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ıx_locations_warehouse_ıd",
                table: "locations",
                column: "warehouse_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_products_barcode",
                table: "products",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ıx_products_category_ıd",
                table: "products",
                column: "category_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_security_audit_log_user_ıd",
                table: "security_audit_log",
                column: "user_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_stock_levels_location_ıd",
                table: "stock_levels",
                column: "location_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_stock_levels_product_ıd_location_ıd",
                table: "stock_levels",
                columns: new[] { "product_ıd", "location_ıd" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ıx_stock_movements_product_ıd",
                table: "stock_movements",
                column: "product_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_user_warehouse_user_ıd",
                table: "user_warehouse",
                column: "user_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_user_warehouse_warehouse_ıd",
                table: "user_warehouse",
                column: "warehouse_ıd");

            migrationBuilder.CreateIndex(
                name: "ıx_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "asset");

            migrationBuilder.DropTable(
                name: "asset_history");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "security_audit_log");

            migrationBuilder.DropTable(
                name: "stock_levels");

            migrationBuilder.DropTable(
                name: "stock_movements");

            migrationBuilder.DropTable(
                name: "user_warehouse");

            migrationBuilder.DropTable(
                name: "locations");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "warehouses");

            migrationBuilder.DropTable(
                name: "categories");
        }
    }
}
