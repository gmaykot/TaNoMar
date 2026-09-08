using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanCatalogAndModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanCommunityVote",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanCustomMetrics",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanDiary",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanMarine",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanOffline",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanRankingEmphasis",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Featured",
                table: "Plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MonthlyPriceCents",
                table: "Plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Tagline",
                table: "Plans",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                columns: new[] { "CanCommunityVote", "CanCustomMetrics", "CanDiary", "CanMarine", "CanOffline", "CanRankingEmphasis", "Featured", "MonthlyPriceCents", "SortOrder", "Tagline" },
                values: new object[] { false, false, false, false, false, false, false, 0, 0, "Consulta o mapa TáNoMar." });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                columns: new[] { "CanCommunityVote", "CanCustomMetrics", "CanDiary", "CanMarine", "CanOffline", "CanRankingEmphasis", "Featured", "MonthlyPriceCents", "SortOrder", "Tagline" },
                values: new object[] { true, true, true, true, true, true, false, 1490, 1, "O primeiro comando da sua pesca." });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                columns: new[] { "CanCommunityVote", "CanCustomMetrics", "CanDiary", "CanMarine", "CanOffline", "CanRankingEmphasis", "Featured", "MonthlyPriceCents", "SortOrder", "Tagline" },
                values: new object[] { true, true, true, true, true, true, true, 1990, 2, "O equilíbrio para planejar a semana." });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                columns: new[] { "CanCommunityVote", "CanCustomMetrics", "CanDiary", "CanMarine", "CanOffline", "CanRankingEmphasis", "Featured", "MonthlyPriceCents", "SortOrder", "Tagline" },
                values: new object[] { true, true, true, true, true, true, false, 2490, 3, "Mais cotas para quem pesca o ano todo." });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CanCommunityVote", table: "Plans");
            migrationBuilder.DropColumn(name: "CanCustomMetrics", table: "Plans");
            migrationBuilder.DropColumn(name: "CanDiary", table: "Plans");
            migrationBuilder.DropColumn(name: "CanMarine", table: "Plans");
            migrationBuilder.DropColumn(name: "CanOffline", table: "Plans");
            migrationBuilder.DropColumn(name: "CanRankingEmphasis", table: "Plans");
            migrationBuilder.DropColumn(name: "Featured", table: "Plans");
            migrationBuilder.DropColumn(name: "MonthlyPriceCents", table: "Plans");
            migrationBuilder.DropColumn(name: "SortOrder", table: "Plans");
            migrationBuilder.DropColumn(name: "Tagline", table: "Plans");
        }
    }
}
