using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserFailedAttemptCounters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "failed_password_reset_attempts",
                table: "users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "failed_verification_attempts",
                table: "users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_failed_password_reset_attempt",
                table: "users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_failed_verification_attempt",
                table: "users",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "failed_password_reset_attempts",
                table: "users");

            migrationBuilder.DropColumn(
                name: "failed_verification_attempts",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_failed_password_reset_attempt",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_failed_verification_attempt",
                table: "users");
        }
    }
}
