using Microsoft.EntityFrameworkCore;

namespace TaNoMar.Api.Data;

public static class TaNoMarDbSeeder
{
    public static async Task SeedAsync(TaNoMarDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.MigrateAsync(cancellationToken);
        await SeedOfficialSpotsAsync(db, cancellationToken);
    }

    internal static async Task SeedOfficialSpotsAsync(TaNoMarDbContext db, CancellationToken cancellationToken = default)
    {
        var existing = await db.FishingSpots.ToListAsync(cancellationToken);
        var changed = false;
        foreach (var item in OfficialSpotCatalog.All)
        {
            var spot = OfficialSpotCatalog.ExistingMatch(existing, item);
            if (spot is null)
            {
                spot = OfficialSpotCatalog.ToSpot(item);
                db.FishingSpots.Add(spot);
                existing.Add(spot);
                changed = true;
                continue;
            }

            var type = spot.Type;
            var environment = spot.FishingEnvironment;
            var access = spot.AccessType;
            var region = spot.Region;
            var latitude = spot.Latitude;
            var longitude = spot.Longitude;
            var orientation = spot.SeaOrientationDegrees;
            OfficialSpotCatalog.Complement(spot, item);
            if (type != spot.Type
                || environment != spot.FishingEnvironment
                || access != spot.AccessType
                || region != spot.Region
                || latitude != spot.Latitude
                || longitude != spot.Longitude
                || orientation != spot.SeaOrientationDegrees)
            {
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync(cancellationToken);
    }
}
