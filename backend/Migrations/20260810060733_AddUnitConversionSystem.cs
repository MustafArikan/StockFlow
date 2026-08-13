using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUnitConversionSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "category",
                table: "units",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "input_quantity",
                table: "stock_movements",
                type: "decimal(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "input_unit_id",
                table: "stock_movements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_unit_conversions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    alternative_unit_id = table.Column<int>(type: "int", nullable: false),
                    conversion_factor = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    is_default = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_unit_conversions", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_unit_conversions_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_product_unit_conversions_units_alternative_unit_id",
                        column: x => x.alternative_unit_id,
                        principalTable: "units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_input_unit_id",
                table: "stock_movements",
                column: "input_unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_unit_conversions_alternative_unit_id",
                table: "product_unit_conversions",
                column: "alternative_unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_unit_conversions_product_id_alternative_unit_id",
                table: "product_unit_conversions",
                columns: new[] { "product_id", "alternative_unit_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_units_input_unit_id",
                table: "stock_movements",
                column: "input_unit_id",
                principalTable: "units",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_units_input_unit_id",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "product_unit_conversions");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_input_unit_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "category",
                table: "units");

            migrationBuilder.DropColumn(
                name: "input_quantity",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "input_unit_id",
                table: "stock_movements");
        }
    }
}
