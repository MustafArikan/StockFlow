using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPimAndFinancials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "destination",
                table: "stock_movements",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "stock_movements",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "supplier_id",
                table: "stock_movements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "total_price",
                table: "stock_movements",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "unit_price",
                table: "stock_movements",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "cost",
                table: "products",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "price",
                table: "products",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "attribute_rules",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    category_id = table.Column<int>(type: "int", nullable: true),
                    attribute_key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    data_type = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    is_required = table.Column<bool>(type: "bit", nullable: false),
                    allowed_values = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attribute_rules", x => x.id);
                    table.ForeignKey(
                        name: "fk_attribute_rules_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    contact_name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    contact_email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    contact_phone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_suppliers", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_supplier_id",
                table: "stock_movements",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "ix_attribute_rules_category_id",
                table: "attribute_rules",
                column: "category_id");

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_suppliers_supplier_id",
                table: "stock_movements",
                column: "supplier_id",
                principalTable: "suppliers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_suppliers_supplier_id",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "attribute_rules");

            migrationBuilder.DropTable(
                name: "suppliers");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_supplier_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "destination",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "document_number",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "supplier_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "total_price",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "unit_price",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "cost",
                table: "products");

            migrationBuilder.DropColumn(
                name: "price",
                table: "products");
        }
    }
}
