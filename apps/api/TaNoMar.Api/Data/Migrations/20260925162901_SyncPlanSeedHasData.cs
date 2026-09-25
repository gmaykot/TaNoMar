using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncPlanSeedHasData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                columns: new[] { "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { true, true });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { true, true, true, true });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { true, true, true, true });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { true, true, true, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                columns: new[] { "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { false, false });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { false, false, false, false });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { false, false, false, false });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                columns: new[] { "CanFavorites", "CanForecastAlerts", "CanSpotArrival", "CanSpotForecastToggle" },
                values: new object[] { false, false, false, false });
        }
    }
}
