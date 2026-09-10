using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations;

[DbContext(typeof(TaNoMarDbContext))]
[Migration("20260910120000_AddOfficialSpotCatalogFlags")]
public sealed class AddOfficialSpotCatalogFlags : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsActive",
            table: "FishingSpots",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.AddColumn<bool>(
            name: "IsFreeDefault",
            table: "FishingSpots",
            type: "boolean",
            nullable: false,
            defaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsActive",
            table: "FishingSpots");

        migrationBuilder.DropColumn(
            name: "IsFreeDefault",
            table: "FishingSpots");
    }
}
