using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CommunityReportVotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "FishingSpots",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(2026, 9, 5, 0, 0, 0, 0, DateTimeKind.Utc), TimeSpan.Zero));

            migrationBuilder.CreateTable(
                name: "CommunityReportVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityReportVotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityReportVotes_ReportId_UserId",
                table: "CommunityReportVotes",
                columns: new[] { "ReportId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunityReportVotes");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "FishingSpots");
        }
    }
}
