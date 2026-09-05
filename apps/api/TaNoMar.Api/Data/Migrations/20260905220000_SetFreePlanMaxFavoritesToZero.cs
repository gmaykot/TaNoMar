using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SetFreePlanMaxFavoritesToZero : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                column: "MaxFavorites",
                value: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                column: "MaxFavorites",
                value: 3);
        }
    }
}
