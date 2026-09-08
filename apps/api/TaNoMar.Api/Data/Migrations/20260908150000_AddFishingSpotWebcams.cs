using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFishingSpotWebcams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanLiveWebcams",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "FishingSpotWebcams",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FishingSpotId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "text", nullable: false),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    LastAvailabilityCheck = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FishingSpotWebcams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FishingSpotWebcams_FishingSpots_FishingSpotId",
                        column: x => x.FishingSpotId,
                        principalTable: "FishingSpots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                column: "CanLiveWebcams",
                value: false);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                column: "CanLiveWebcams",
                value: false);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                column: "CanLiveWebcams",
                value: false);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                column: "CanLiveWebcams",
                value: true);

            migrationBuilder.CreateIndex(
                name: "IX_FishingSpotWebcams_FishingSpotId",
                table: "FishingSpotWebcams",
                column: "FishingSpotId",
                unique: true,
                filter: "\"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_FishingSpotWebcams_FishingSpotId_Provider_ExternalId",
                table: "FishingSpotWebcams",
                columns: new[] { "FishingSpotId", "Provider", "ExternalId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FishingSpotWebcams");

            migrationBuilder.DropColumn(
                name: "CanLiveWebcams",
                table: "Plans");
        }
    }
}
