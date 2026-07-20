using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUiComponentsToAttributeRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "max_value",
                table: "attribute_rules",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "min_value",
                table: "attribute_rules",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "target_level",
                table: "attribute_rules",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ui_component",
                table: "attribute_rules",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "max_value",
                table: "attribute_rules");

            migrationBuilder.DropColumn(
                name: "min_value",
                table: "attribute_rules");

            migrationBuilder.DropColumn(
                name: "target_level",
                table: "attribute_rules");

            migrationBuilder.DropColumn(
                name: "ui_component",
                table: "attribute_rules");
        }
    }
}
