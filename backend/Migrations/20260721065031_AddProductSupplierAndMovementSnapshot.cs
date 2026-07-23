using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddProductSupplierAndMovementSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "supplier_name",
                table: "stock_movements",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "supplier_tax_number",
                table: "stock_movements",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    supplier_id = table.Column<int>(type: "int", nullable: false),
                    purchase_price = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    supplier_product_code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    lead_time_days = table.Column<int>(type: "int", nullable: true),
                    is_preferred = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_suppliers", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_suppliers_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_product_suppliers_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_product_suppliers_product_id_supplier_id",
                table: "product_suppliers",
                columns: new[] { "product_id", "supplier_id" },
                unique: true,
                filter: "[is_deleted] = 0");

            migrationBuilder.CreateIndex(
                name: "ix_product_suppliers_supplier_id",
                table: "product_suppliers",
                column: "supplier_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_suppliers");

            migrationBuilder.DropColumn(
                name: "supplier_name",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "supplier_tax_number",
                table: "stock_movements");
        }
    }
}
