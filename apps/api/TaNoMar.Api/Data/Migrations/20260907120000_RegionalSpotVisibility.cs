using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations;

[DbContext(typeof(TaNoMarDbContext))]
[Migration("20260907120000_RegionalSpotVisibility")]
public sealed class RegionalSpotVisibility : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Region",
            table: "Notifications",
            type: "text",
            nullable: true);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Region" = CASE
                WHEN "Slug" IN ('campeche', 'morro_das_pedras', 'armacao', 'matadeiro', 'pantano_do_sul', 'acores', 'solidao') THEN 'Sul da ilha'
                WHEN "Slug" IN ('joaquina', 'barra_da_lagoa', 'lagoa-conceicao') THEN 'Leste da ilha'
                WHEN "Slug" = 'ribeirao' THEN 'Oeste da ilha'
                ELSE "Region"
            END
            WHERE "Slug" IN ('campeche', 'morro_das_pedras', 'armacao', 'matadeiro', 'pantano_do_sul', 'acores', 'solidao', 'joaquina', 'barra_da_lagoa', 'lagoa-conceicao', 'ribeirao');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Region" = 'Ilha de Santa Catarina'
            WHERE "Slug" IN ('campeche', 'morro_das_pedras', 'armacao', 'matadeiro', 'pantano_do_sul', 'acores', 'solidao', 'joaquina', 'barra_da_lagoa', 'lagoa-conceicao', 'ribeirao');
            """);

        migrationBuilder.DropColumn(
            name: "Region",
            table: "Notifications");
    }
}
