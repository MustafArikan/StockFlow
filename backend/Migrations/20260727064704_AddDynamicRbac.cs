using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicRbac : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "role",
                table: "users");

            migrationBuilder.AddColumn<int>(
                name: "role_id",
                table: "users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "app_permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    module = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_permissions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "app_roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "app_role_permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_id = table.Column<int>(type: "int", nullable: false),
                    permission_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_role_permissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_app_role_permissions_app_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "app_permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_app_role_permissions_app_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "app_roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_role_id",
                table: "users",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_app_permissions_name",
                table: "app_permissions",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_app_role_permissions_permission_id",
                table: "app_role_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "ix_app_role_permissions_role_id_permission_id",
                table: "app_role_permissions",
                columns: new[] { "role_id", "permission_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_app_roles_name",
                table: "app_roles",
                column: "name",
                unique: true);

            migrationBuilder.Sql("SET IDENTITY_INSERT app_roles ON; INSERT INTO app_roles (id, name, description, created_at, is_deleted) VALUES (0, 'Default', 'Default Role', GETUTCDATE(), 0); SET IDENTITY_INSERT app_roles OFF;");

            migrationBuilder.AddForeignKey(
                name: "fk_users_app_roles_role_id",
                table: "users",
                column: "role_id",
                principalTable: "app_roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_app_roles_role_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "app_role_permissions");

            migrationBuilder.DropTable(
                name: "app_permissions");

            migrationBuilder.DropTable(
                name: "app_roles");

            migrationBuilder.DropIndex(
                name: "ix_users_role_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "role_id",
                table: "users");

            migrationBuilder.AddColumn<string>(
                name: "role",
                table: "users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
