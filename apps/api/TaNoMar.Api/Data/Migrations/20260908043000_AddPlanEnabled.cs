using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEnabled",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                column: "IsEnabled",
                value: true);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                column: "IsEnabled",
                value: true);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                column: "IsEnabled",
                value: true);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                column: "IsEnabled",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEnabled",
                table: "Plans");
        }
    }
}
