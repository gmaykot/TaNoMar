namespace TaNoMar.Api.Fishing;

internal static class FishingScoreCalculator
{
    public static double Calculate(
        double speed,
        double gust,
        double windFrom,
        double seaOrientation,
        double waveHeight,
        double wavePeriod,
        double rainProbability,
        double rainMm,
        int hour,
        string profile)
    {
        var score =
            WindSpeedScore(speed) * 0.25
            + WindDirectionScore(windFrom, seaOrientation) * 0.25
            + WaveScore(waveHeight, profile) * 0.20
            + PeriodScore(wavePeriod) * 0.10
            + RainProbabilityScore(rainProbability) * 0.10
            + HourScore(hour) * 0.10;

        score -= GustPenalty(gust);
        score -= RainAmountPenalty(rainMm);

        if (speed >= 30 && gust >= 40) score -= 1.0;
        if (waveHeight >= 2.2) score -= 1.5;

        return Math.Round(Math.Clamp(score, 0.0, 10.0), 1, MidpointRounding.ToEven);
    }

    private static double AngularDifference(double a, double b)
        => Math.Abs((a - b + 540) % 360 - 180);

    private static double WindSpeedScore(double speed)
    {
        if (speed <= 8) return 10.0;
        if (speed <= 12) return 9.0;
        if (speed <= 16) return 8.0;
        if (speed <= 20) return 6.5;
        if (speed <= 24) return 5.0;
        if (speed <= 30) return 3.0;
        if (speed <= 35) return 1.5;
        return 0.5;
    }

    private static double GustPenalty(double gust)
    {
        if (gust >= 50) return 4.0;
        if (gust >= 45) return 3.0;
        if (gust >= 40) return 2.3;
        if (gust >= 35) return 1.6;
        if (gust >= 30) return 1.0;
        if (gust >= 25) return 0.5;
        return 0.0;
    }

    private static double WindDirectionScore(double windFrom, double seaOrientation)
    {
        var onshoreDifference = AngularDifference(windFrom, seaOrientation);
        var offshoreDirection = (seaOrientation + 180) % 360;
        var offshoreDifference = AngularDifference(windFrom, offshoreDirection);

        if (offshoreDifference <= 25) return 10.0;
        if (offshoreDifference <= 50) return 9.0;
        if (offshoreDifference <= 80) return 7.5;
        if (onshoreDifference <= 25) return 2.0;
        if (onshoreDifference <= 50) return 3.5;
        if (onshoreDifference <= 80) return 5.0;
        return 6.5;
    }

    private static double WaveScore(double height, string profile)
    {
        if (profile == "praia_protegida")
        {
            if (height is >= 0.3 and <= 0.9) return 9.5;
            if (height < 0.3) return 7.5;
            if (height <= 1.2) return 8.0;
            if (height <= 1.5) return 6.0;
            if (height <= 1.8) return 3.5;
            return 1.0;
        }

        if (profile == "praia_aberta")
        {
            if (height is >= 0.4 and <= 1.2) return 9.5;
            if (height < 0.4) return 7.0;
            if (height <= 1.5) return 8.0;
            if (height <= 1.8) return 6.0;
            if (height <= 2.1) return 4.0;
            if (height <= 2.5) return 2.0;
            return 0.5;
        }

        if (height is >= 0.4 and <= 1.1) return 9.0;
        if (height < 0.4) return 7.0;
        if (height <= 1.5) return 7.5;
        if (height <= 1.9) return 5.0;
        if (height <= 2.3) return 2.5;
        return 0.5;
    }

    private static double PeriodScore(double period)
    {
        if (period <= 0) return 5.0;
        if (period is >= 6 and <= 10) return 9.0;
        if (period is >= 5 and < 6) return 7.5;
        if (period is >= 4 and < 5) return 6.0;
        if (period is > 10 and <= 12) return 7.5;
        if (period is > 12 and <= 14) return 5.5;
        if (period > 14) return 3.5;
        return 5.0;
    }

    private static double RainProbabilityScore(double probability)
    {
        if (probability <= 10) return 10.0;
        if (probability <= 20) return 9.0;
        if (probability <= 35) return 7.5;
        if (probability <= 50) return 5.5;
        if (probability <= 65) return 3.5;
        if (probability <= 80) return 2.0;
        return 0.5;
    }

    private static double RainAmountPenalty(double amount)
    {
        if (amount >= 8) return 3.0;
        if (amount >= 4) return 2.0;
        if (amount >= 2) return 1.2;
        if (amount >= 0.5) return 0.5;
        return 0.0;
    }

    private static double HourScore(int hour)
    {
        if (hour is >= 5 and <= 8) return 10.0;
        if (hour is >= 16 and <= 19) return 9.5;
        if (hour is >= 9 and <= 11) return 8.0;
        if (hour is >= 12 and <= 15) return 6.5;
        return 5.5;
    }
}
