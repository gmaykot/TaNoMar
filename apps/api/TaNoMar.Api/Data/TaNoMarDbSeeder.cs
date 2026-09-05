using Microsoft.EntityFrameworkCore;

namespace TaNoMar.Api.Data;

public static class TaNoMarDbSeeder
{
    public static async Task SeedAsync(TaNoMarDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.MigrateAsync(cancellationToken);
        if (!await db.FishingSpots.AnyAsync(cancellationToken))
        {
            db.FishingSpots.AddRange(
                Spot("campeche", "Campeche", -27.65407, -48.46908, 110, "praia_aberta"),
                Spot("morro_das_pedras", "Morro das Pedras", -27.7045, -48.486, 120, "praia_aberta"),
                Spot("armacao", "Armação", -27.73539, -48.50789, 105, "praia_semi_aberta"),
                Spot("matadeiro", "Matadeiro", -27.7556, -48.49822, 115, "praia_semi_aberta"),
                Spot("pantano_do_sul", "Pântano do Sul", -27.77573, -48.50612, 145, "praia_protegida"),
                Spot("acores", "Açores", -27.7864, -48.526, 165, "praia_semi_aberta"),
                Spot("solidao", "Solidão", -27.8055, -48.532, 170, "praia_semi_aberta"),
                Spot("joaquina", "Joaquina", -27.6308, -48.4508, 100, "praia_aberta"),
                Spot("barra_da_lagoa", "Barra da Lagoa", -27.5745, -48.424, 90, "praia_semi_aberta"),
                Spot("lagoa-conceicao", "Lagoa da Conceição", -27.55968, -48.45365, 90, "praia_protegida"),
                Spot("ribeirao", "Ribeirão da Ilha", -27.71773, -48.56266, 270, "praia_protegida"));
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static FishingSpot Spot(string slug, string name, double latitude, double longitude, double orientation, string profile)
        => new(slug, name, latitude, longitude, orientation, profile);
}
