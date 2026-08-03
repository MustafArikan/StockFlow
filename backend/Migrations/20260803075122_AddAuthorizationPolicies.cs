using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthorizationPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_authorization_policies",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    key = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    permit_limit = table.Column<int>(type: "int", nullable: false),
                    window_seconds = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_authorization_policies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "app_policy_permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    policy_id = table.Column<int>(type: "int", nullable: false),
                    permission_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_policy_permissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_app_policy_permissions_app_authorization_policies_policy_id",
                        column: x => x.policy_id,
                        principalTable: "app_authorization_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_app_policy_permissions_app_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "app_permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_app_authorization_policies_key",
                table: "app_authorization_policies",
                column: "key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_app_policy_permissions_permission_id",
                table: "app_policy_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "ix_app_policy_permissions_policy_id_permission_id",
                table: "app_policy_permissions",
                columns: new[] { "policy_id", "permission_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_policy_permissions");

            migrationBuilder.DropTable(
                name: "app_authorization_policies");
        }
    }
}
