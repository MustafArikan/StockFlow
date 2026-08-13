using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUnitSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                table: "stock_movements",
                type: "decimal(18,3)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                table: "stock_levels",
                type: "decimal(18,3)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "unit_id",
                table: "products",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "units",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    short_code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    allows_decimal = table.Column<bool>(type: "bit", nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    is_system_unit = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_units", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_products_unit_id",
                table: "products",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "ix_units_short_code",
                table: "units",
                column: "short_code",
                unique: true);

            migrationBuilder.Sql("SET IDENTITY_INSERT units ON; INSERT INTO units (id, name, short_code, allows_decimal, is_active, is_system_unit, created_at, is_deleted) VALUES (1, 'Adet', 'ADET', 0, 1, 1, GETUTCDATE(), 0); SET IDENTITY_INSERT units OFF;");

            migrationBuilder.AddForeignKey(
                name: "fk_products_units_unit_id",
                table: "products",
                column: "unit_id",
                principalTable: "units",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_products_units_unit_id",
                table: "products");

            migrationBuilder.DropTable(
                name: "units");

            migrationBuilder.DropIndex(
                name: "ix_products_unit_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "unit_id",
                table: "products");

            migrationBuilder.AlterColumn<int>(
                name: "quantity",
                table: "stock_movements",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,3)");

            migrationBuilder.AlterColumn<int>(
                name: "quantity",
                table: "stock_levels",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,3)");
        }
    }
}
