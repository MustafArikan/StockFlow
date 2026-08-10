using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddGs1BarcodeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_stock_levels_product_id_location_id",
                table: "stock_levels");

            migrationBuilder.AddColumn<int>(
                name: "batch_id",
                table: "stock_movements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "batch_id",
                table: "stock_levels",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "barcode_type",
                table: "products",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "barcode",
                table: "product_unit_conversions",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "barcode_type",
                table: "product_unit_conversions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "pallet_shipments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    sscc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    source_warehouse_id = table.Column<int>(type: "int", nullable: true),
                    description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_pallet_shipments", x => x.id);
                    table.ForeignKey(
                        name: "fk_pallet_shipments_warehouses_source_warehouse_id",
                        column: x => x.source_warehouse_id,
                        principalTable: "warehouses",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "product_batches",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    lot_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    manufacture_date = table.Column<DateOnly>(type: "date", nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_batches", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_batches_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pallet_contents",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    pallet_shipment_id = table.Column<int>(type: "int", nullable: false),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    batch_id = table.Column<int>(type: "int", nullable: true),
                    quantity = table.Column<decimal>(type: "decimal(18,3)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_pallet_contents", x => x.id);
                    table.ForeignKey(
                        name: "fk_pallet_contents_pallet_shipments_pallet_shipment_id",
                        column: x => x.pallet_shipment_id,
                        principalTable: "pallet_shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_pallet_contents_product_batches_batch_id",
                        column: x => x.batch_id,
                        principalTable: "product_batches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_pallet_contents_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_stock_movements_batch_id",
                table: "stock_movements",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_levels_batch_id",
                table: "stock_levels",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_stock_levels_product_id_location_id_batch_id",
                table: "stock_levels",
                columns: new[] { "product_id", "location_id", "batch_id" },
                unique: true,
                filter: "[batch_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_product_unit_conversions_barcode",
                table: "product_unit_conversions",
                column: "barcode",
                unique: true,
                filter: "[barcode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_pallet_contents_batch_id",
                table: "pallet_contents",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_pallet_contents_pallet_shipment_id",
                table: "pallet_contents",
                column: "pallet_shipment_id");

            migrationBuilder.CreateIndex(
                name: "ix_pallet_contents_product_id",
                table: "pallet_contents",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_pallet_shipments_source_warehouse_id",
                table: "pallet_shipments",
                column: "source_warehouse_id");

            migrationBuilder.CreateIndex(
                name: "ix_pallet_shipments_sscc",
                table: "pallet_shipments",
                column: "sscc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_product_batches_product_id_lot_number",
                table: "product_batches",
                columns: new[] { "product_id", "lot_number" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_levels_product_batches_batch_id",
                table: "stock_levels",
                column: "batch_id",
                principalTable: "product_batches",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_stock_movements_product_batches_batch_id",
                table: "stock_movements",
                column: "batch_id",
                principalTable: "product_batches",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_stock_levels_product_batches_batch_id",
                table: "stock_levels");

            migrationBuilder.DropForeignKey(
                name: "fk_stock_movements_product_batches_batch_id",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "pallet_contents");

            migrationBuilder.DropTable(
                name: "pallet_shipments");

            migrationBuilder.DropTable(
                name: "product_batches");

            migrationBuilder.DropIndex(
                name: "ix_stock_movements_batch_id",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "ix_stock_levels_batch_id",
                table: "stock_levels");

            migrationBuilder.DropIndex(
                name: "ix_stock_levels_product_id_location_id_batch_id",
                table: "stock_levels");

            migrationBuilder.DropIndex(
                name: "ix_product_unit_conversions_barcode",
                table: "product_unit_conversions");

            migrationBuilder.DropColumn(
                name: "batch_id",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "batch_id",
                table: "stock_levels");

            migrationBuilder.DropColumn(
                name: "barcode_type",
                table: "products");

            migrationBuilder.DropColumn(
                name: "barcode",
                table: "product_unit_conversions");

            migrationBuilder.DropColumn(
                name: "barcode_type",
                table: "product_unit_conversions");

            migrationBuilder.CreateIndex(
                name: "ix_stock_levels_product_id_location_id",
                table: "stock_levels",
                columns: new[] { "product_id", "location_id" },
                unique: true);
        }
    }
}
