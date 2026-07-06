using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToStockMovements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "user_id",
                table: "stock_movements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_user_id",
                table: "stock_movements",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_users_user_id",
                table: "stock_movements",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_users_user_id",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_user_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "user_id",
                table: "stock_movements");
        }
    }
}
