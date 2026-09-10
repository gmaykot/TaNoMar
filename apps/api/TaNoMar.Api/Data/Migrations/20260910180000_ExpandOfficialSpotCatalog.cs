using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaNoMar.Api.Data.Migrations;

[DbContext(typeof(TaNoMarDbContext))]
[Migration("20260910180000_ExpandOfficialSpotCatalog")]
public sealed class ExpandOfficialSpotCatalog : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "FishingEnvironment",
            table: "FishingSpots",
            type: "text",
            nullable: false,
            defaultValue: "mar_aberto");

        migrationBuilder.AddColumn<string>(
            name: "AccessType",
            table: "FishingSpots",
            type: "text",
            nullable: false,
            defaultValue: "terrestre");

        migrationBuilder.AddColumn<string>(
            name: "RestrictionNotes",
            table: "FishingSpots",
            type: "text",
            nullable: true);

        migrationBuilder.AlterColumn<double>(
            name: "SeaOrientationDegrees",
            table: "FishingSpots",
            type: "double precision",
            nullable: true,
            oldClrType: typeof(double),
            oldType: "double precision");

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Region" = CASE
                WHEN "Region" ILIKE 'Norte da ilha' OR "Region" ILIKE 'Norte' THEN 'norte'
                WHEN "Region" ILIKE 'Sul da ilha' OR "Region" ILIKE 'Sul' THEN 'sul'
                WHEN "Region" ILIKE 'Leste da ilha' OR "Region" ILIKE 'Leste' THEN 'leste'
                WHEN "Region" ILIKE 'Oeste da ilha' OR "Region" ILIKE 'Oeste' THEN 'oeste'
                WHEN "Region" ILIKE 'Continente' THEN 'continente'
                WHEN "Region" ILIKE 'Ilhas' THEN 'ilhas'
                ELSE "Region"
            END;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "UserPreferences"
            SET "Region" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                "Region",
                'Norte da ilha', 'norte'),
                'Sul da ilha', 'sul'),
                'Leste da ilha', 'leste'),
                'Oeste da ilha', 'oeste'),
                'Continente', 'continente'),
                'Ilhas', 'ilhas')
            WHERE "Region" IS NOT NULL;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Region" = 'sul'
            WHERE "Visibility" = 'official'
              AND ("Slug" = 'ribeirao' OR "Name" ILIKE 'Ribeirão da Ilha');
            """);

        migrationBuilder.Sql(
            """
            UPDATE "Notifications"
            SET "Region" = CASE
                WHEN "Region" ILIKE 'Norte da ilha' OR "Region" ILIKE 'Norte' THEN 'norte'
                WHEN "Region" ILIKE 'Sul da ilha' OR "Region" ILIKE 'Sul' THEN 'sul'
                WHEN "Region" ILIKE 'Leste da ilha' OR "Region" ILIKE 'Leste' THEN 'leste'
                WHEN "Region" ILIKE 'Oeste da ilha' OR "Region" ILIKE 'Oeste' THEN 'oeste'
                WHEN "Region" ILIKE 'Continente' THEN 'continente'
                WHEN "Region" ILIKE 'Ilhas' THEN 'ilhas'
                ELSE "Region"
            END
            WHERE "Region" IS NOT NULL;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Type" = CASE
                WHEN "Slug" = 'lagoa-conceicao' OR "Name" ILIKE 'Lagoa da Conceição' THEN 'lagoa'
                WHEN "Type" ILIKE 'personalizado' THEN 'outro'
                WHEN "Type" IN ('praia', 'costao', 'canal', 'lagoa', 'rio', 'estuario', 'ilha', 'pier', 'outro') THEN "Type"
                ELSE 'praia'
            END;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "FishingEnvironment" = CASE
                WHEN "Slug" = 'lagoa-conceicao' OR "Name" ILIKE 'Lagoa da Conceição' THEN 'lagunar'
                WHEN "Slug" = 'ribeirao' OR "Region" = 'oeste' THEN 'baia'
                ELSE "FishingEnvironment"
            END
            WHERE "Visibility" = 'official';
            """);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "IsFreeDefault" = ("Slug" IN (
                'campeche',
                'morro_das_pedras',
                'armacao',
                'pantano_do_sul',
                'joaquina',
                'barra_da_lagoa',
                'lagoa-conceicao',
                'ribeirao'
            ))
            WHERE "Visibility" = 'official'
              AND "Slug" IN (
                'campeche',
                'morro_das_pedras',
                'armacao',
                'matadeiro',
                'pantano_do_sul',
                'acores',
                'solidao',
                'joaquina',
                'barra_da_lagoa',
                'lagoa-conceicao',
                'ribeirao'
              );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "Region" = CASE
                WHEN "Region" = 'norte' THEN 'Norte da ilha'
                WHEN "Region" = 'sul' THEN 'Sul da ilha'
                WHEN "Region" = 'leste' THEN 'Leste da ilha'
                WHEN "Region" = 'oeste' THEN 'Oeste da ilha'
                ELSE "Region"
            END;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "UserPreferences"
            SET "Region" = REPLACE(REPLACE(REPLACE(REPLACE(
                "Region",
                'norte', 'Norte da ilha'),
                'sul', 'Sul da ilha'),
                'leste', 'Leste da ilha'),
                'oeste', 'Oeste da ilha')
            WHERE "Region" IS NOT NULL;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "Notifications"
            SET "Region" = CASE
                WHEN "Region" = 'norte' THEN 'Norte da ilha'
                WHEN "Region" = 'sul' THEN 'Sul da ilha'
                WHEN "Region" = 'leste' THEN 'Leste da ilha'
                WHEN "Region" = 'oeste' THEN 'Oeste da ilha'
                ELSE "Region"
            END
            WHERE "Region" IS NOT NULL;
            """);

        migrationBuilder.Sql(
            """
            UPDATE "FishingSpots"
            SET "IsFreeDefault" = TRUE
            WHERE "Visibility" = 'official'
              AND "Slug" IN (
                'campeche',
                'morro_das_pedras',
                'armacao',
                'matadeiro',
                'pantano_do_sul',
                'acores',
                'solidao',
                'joaquina',
                'barra_da_lagoa',
                'lagoa-conceicao',
                'ribeirao'
              );
            """);

        migrationBuilder.AlterColumn<double>(
            name: "SeaOrientationDegrees",
            table: "FishingSpots",
            type: "double precision",
            nullable: false,
            defaultValue: 0.0,
            oldClrType: typeof(double),
            oldType: "double precision",
            oldNullable: true);

        migrationBuilder.DropColumn(
            name: "RestrictionNotes",
            table: "FishingSpots");

        migrationBuilder.DropColumn(
            name: "AccessType",
            table: "FishingSpots");

        migrationBuilder.DropColumn(
            name: "FishingEnvironment",
            table: "FishingSpots");
    }
}
