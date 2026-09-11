using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WhatsAppSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    InstanceName = table.Column<string>(type: "text", nullable: false),
                    DefaultDestinationType = table.Column<string>(type: "text", nullable: true),
                    DefaultDestinationId = table.Column<string>(type: "text", nullable: true),
                    DefaultDestinationName = table.Column<string>(type: "text", nullable: true),
                    NotifyNewUser = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyPlanRequested = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "WhatsAppSettings",
                columns: new[] { "Id", "CreatedAt", "DefaultDestinationId", "DefaultDestinationName", "DefaultDestinationType", "Enabled", "InstanceName", "NotifyNewUser", "NotifyPlanRequested", "UpdatedAt" },
                values: new object[] { new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0011"), new DateTimeOffset(new DateTime(2026, 9, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, null, null, false, "TaNoMar", true, true, new DateTimeOffset(new DateTime(2026, 9, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WhatsAppSettings");
        }
    }
}
