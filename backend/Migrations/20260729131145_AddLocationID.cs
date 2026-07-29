using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationID : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "source_location_id",
                table: "stock_movements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "target_location_id",
                table: "stock_movements",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "source_location_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "target_location_id",
                table: "stock_movements");
        }
    }
}
