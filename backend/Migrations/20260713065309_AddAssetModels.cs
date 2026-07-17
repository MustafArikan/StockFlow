using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_asset_products_product_id",
                table: "asset");

            migrationBuilder.DropForeignKey(
                name: "fk_asset_history_users_user_id",
                table: "asset_history");

            migrationBuilder.DropForeignKey(
                name: "fk_security_audit_log_users_user_id",
                table: "security_audit_log");

            migrationBuilder.DropPrimaryKey(
                name: "pk_security_audit_log",
                table: "security_audit_log");

            migrationBuilder.DropPrimaryKey(
                name: "pk_asset_history",
                table: "asset_history");

            migrationBuilder.DropPrimaryKey(
                name: "pk_asset",
                table: "asset");

            migrationBuilder.RenameTable(
                name: "security_audit_log",
                newName: "security_audit_logs");

            migrationBuilder.RenameTable(
                name: "asset_history",
                newName: "asset_histories");

            migrationBuilder.RenameTable(
                name: "asset",
                newName: "assets");

            migrationBuilder.RenameIndex(
                name: "ix_security_audit_log_user_id",
                table: "security_audit_logs",
                newName: "ix_security_audit_logs_user_id");

            migrationBuilder.RenameIndex(
                name: "ix_asset_history_user_id",
                table: "asset_histories",
                newName: "ix_asset_histories_user_id");

            migrationBuilder.RenameIndex(
                name: "ix_asset_product_id",
                table: "assets",
                newName: "ix_assets_product_id");

            migrationBuilder.AddColumn<string>(
                name: "action_type",
                table: "security_audit_logs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "entity_id",
                table: "security_audit_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entity_name",
                table: "security_audit_logs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ip_address",
                table: "security_audit_logs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "new_values",
                table: "security_audit_logs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "old_values",
                table: "security_audit_logs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "asset_id",
                table: "asset_histories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "event_type",
                table: "asset_histories",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "asset_histories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "product_id",
                table: "assets",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assigned_to_id",
                table: "assets",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "assets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "serial_number",
                table: "assets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "assets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "pk_security_audit_logs",
                table: "security_audit_logs",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_asset_histories",
                table: "asset_histories",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_assets",
                table: "assets",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "ix_asset_histories_asset_id",
                table: "asset_histories",
                column: "asset_id");

            migrationBuilder.CreateIndex(
                name: "ix_assets_assigned_to_id",
                table: "assets",
                column: "assigned_to_id");

            migrationBuilder.CreateIndex(
                name: "ix_assets_serial_number",
                table: "assets",
                column: "serial_number",
                unique: true,
                filter: "[is_deleted] = 0");

            migrationBuilder.AddForeignKey(
                name: "fk_asset_histories_assets_asset_id",
                table: "asset_histories",
                column: "asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_asset_histories_users_user_id",
                table: "asset_histories",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_assets_products_product_id",
                table: "assets",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_assets_users_assigned_to_id",
                table: "assets",
                column: "assigned_to_id",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_security_audit_logs_users_user_id",
                table: "security_audit_logs",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_asset_histories_assets_asset_id",
                table: "asset_histories");

            migrationBuilder.DropForeignKey(
                name: "fk_asset_histories_users_user_id",
                table: "asset_histories");

            migrationBuilder.DropForeignKey(
                name: "fk_assets_products_product_id",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "fk_assets_users_assigned_to_id",
                table: "assets");

            migrationBuilder.DropForeignKey(
                name: "fk_security_audit_logs_users_user_id",
                table: "security_audit_logs");

            migrationBuilder.DropPrimaryKey(
                name: "pk_security_audit_logs",
                table: "security_audit_logs");

            migrationBuilder.DropPrimaryKey(
                name: "pk_assets",
                table: "assets");

            migrationBuilder.DropIndex(
                name: "ix_assets_assigned_to_id",
                table: "assets");

            migrationBuilder.DropIndex(
                name: "ix_assets_serial_number",
                table: "assets");

            migrationBuilder.DropPrimaryKey(
                name: "pk_asset_histories",
                table: "asset_histories");

            migrationBuilder.DropIndex(
                name: "ix_asset_histories_asset_id",
                table: "asset_histories");

            migrationBuilder.DropColumn(
                name: "action_type",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "entity_id",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "entity_name",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "ip_address",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "new_values",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "old_values",
                table: "security_audit_logs");

            migrationBuilder.DropColumn(
                name: "assigned_to_id",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "notes",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "serial_number",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "status",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "asset_id",
                table: "asset_histories");

            migrationBuilder.DropColumn(
                name: "event_type",
                table: "asset_histories");

            migrationBuilder.DropColumn(
                name: "notes",
                table: "asset_histories");

            migrationBuilder.RenameTable(
                name: "security_audit_logs",
                newName: "security_audit_log");

            migrationBuilder.RenameTable(
                name: "assets",
                newName: "asset");

            migrationBuilder.RenameTable(
                name: "asset_histories",
                newName: "asset_history");

            migrationBuilder.RenameIndex(
                name: "ix_security_audit_logs_user_id",
                table: "security_audit_log",
                newName: "ix_security_audit_log_user_id");

            migrationBuilder.RenameIndex(
                name: "ix_assets_product_id",
                table: "asset",
                newName: "ix_asset_product_id");

            migrationBuilder.RenameIndex(
                name: "ix_asset_histories_user_id",
                table: "asset_history",
                newName: "ix_asset_history_user_id");

            migrationBuilder.AlterColumn<int>(
                name: "product_id",
                table: "asset",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddPrimaryKey(
                name: "pk_security_audit_log",
                table: "security_audit_log",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_asset",
                table: "asset",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_asset_history",
                table: "asset_history",
                column: "id");

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
                name: "fk_security_audit_log_users_user_id",
                table: "security_audit_log",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id");
        }
    }
}
