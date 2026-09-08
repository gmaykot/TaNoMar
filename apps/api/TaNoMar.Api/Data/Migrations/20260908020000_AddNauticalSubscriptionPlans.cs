using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNauticalSubscriptionPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                column: "Name",
                value: "Mestre");

            migrationBuilder.InsertData(
                table: "Plans",
                columns: new[] { "Id", "Code", "MaxAlerts", "MaxFavorites", "MaxForecastDays", "MaxPersonalSpots", "Name" },
                values: new object[,]
                {
                    { new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"), "arrais", 5, 10, 5, 5, "Arrais" },
                    { new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"), "capitao", 20, 40, 8, 20, "Capitão" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"));

            migrationBuilder.DeleteData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"));

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                column: "Name",
                value: "Premium");
        }
    }
}
