namespace TaNoMar.Api.Webcams;

internal static class WebcamGeo
{
    private const double EarthRadiusKm = 6371;

    public static double DistanceKm(double latitude1, double longitude1, double latitude2, double longitude2)
    {
        var lat1 = DegreesToRadians(latitude1);
        var lat2 = DegreesToRadians(latitude2);
        var dLat = DegreesToRadians(latitude2 - latitude1);
        var dLon = DegreesToRadians(longitude2 - longitude1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1) * Math.Cos(lat2) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return Math.Round(EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a)), 1);
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;
}
