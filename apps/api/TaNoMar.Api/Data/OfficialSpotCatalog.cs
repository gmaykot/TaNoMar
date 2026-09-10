namespace TaNoMar.Api.Data;

internal sealed record OfficialSpotDefinition(
    string Slug,
    string Name,
    string Region,
    string Type,
    string FishingEnvironment,
    string AccessType,
    string Profile,
    double? Latitude,
    double? Longitude,
    double? SeaOrientationDegrees,
    bool IsFreeDefault,
    string City = "Florianópolis",
    string State = "SC",
    string? Description = null,
    string? RestrictionNotes = null,
    IReadOnlyList<string>? Aliases = null);

internal static class OfficialSpotCatalog
{
    public static IReadOnlyList<OfficialSpotDefinition> All { get; } =
    [
        // Norte
        Spot("praia-brava", "Praia Brava", "norte", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.3983, -48.4164, 85, free: true),
        Spot("lagoinha-do-norte", "Lagoinha do Norte", "norte", "praia", "mar_aberto", "trilha", "praia_semi_aberta", -27.3856, -48.4197, 70),
        Spot("ponta-das-canas", "Ponta das Canas", "norte", "praia", "baia", "terrestre", "praia_semi_aberta", -27.3950, -48.4280, 20),
        Spot("cachoeira-do-bom-jesus", "Cachoeira do Bom Jesus", "norte", "praia", "baia", "terrestre", "praia_protegida", -27.4214, -48.4286, 10),
        Spot("canasvieiras", "Canasvieiras", "norte", "praia", "baia", "terrestre", "praia_protegida", -27.4289, -48.4531, 10, free: true),
        Spot("jurere", "Jurerê", "norte", "praia", "baia", "terrestre", "praia_protegida", -27.4369, -48.4986, 10),
        Spot("daniela", "Daniela", "norte", "praia", "baia", "terrestre", "praia_protegida", -27.4528, -48.5297, 330),
        Spot("praia-dos-ingleses", "Praia dos Ingleses", "norte", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.4314, -48.3956, 80, free: true),
        Spot("santinho", "Santinho", "norte", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.4567, -48.3758, 90, free: true),
        Spot("praia-do-mocambique", "Praia do Moçambique", "norte", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.5230, -48.3800, 90),

        // Leste
        Spot("barra_da_lagoa", "Barra da Lagoa", "leste", "praia", "mar_aberto", "terrestre", "praia_semi_aberta", -27.5745, -48.424, 90, free: true),
        Spot("canal-da-barra-da-lagoa", "Canal da Barra da Lagoa", "leste", "canal", "estuarino", "terrestre", "praia_semi_aberta", -27.5738, -48.4265, 90, free: true, aliases: ["Canal da Barra"]),
        Spot("galheta", "Galheta", "leste", "praia", "mar_aberto", "trilha", "praia_aberta", -27.5925, -48.4230, 95),
        Spot("praia-mole", "Praia Mole", "leste", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.6017, -48.4342, 100),
        Spot("joaquina", "Joaquina", "leste", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.6308, -48.4508, 100, free: true),
        Spot("lagoa-conceicao", "Lagoa da Conceição", "leste", "lagoa", "lagunar", "terrestre", "praia_protegida", -27.55968, -48.45365, 90, free: true),
        Spot("ponte-da-lagoa-rendeiras", "Ponte da Lagoa / Rendeiras", "leste", "outro", "lagunar", "terrestre", "praia_protegida", -27.6028, -48.4765, null, free: true, aliases: ["Ponte da Lagoa", "Rendeiras"]),
        Spot("costa-da-lagoa", "Costa da Lagoa", "leste", "lagoa", "lagunar", "misto", "praia_protegida", -27.5275, -48.4780, null),
        Spot("rio-tavares", "Rio Tavares", "leste", "rio", "estuarino", "misto", "praia_protegida", -27.6630, -48.4680, null),

        // Sul — slugs dos 7 locais originais do seed são preservados
        Spot("campeche", "Campeche", "sul", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.65407, -48.46908, 110, free: true),
        Spot("morro_das_pedras", "Morro das Pedras", "sul", "praia", "mar_aberto", "terrestre", "praia_aberta", -27.7045, -48.486, 120, free: true),
        Spot("armacao", "Armação", "sul", "praia", "mar_aberto", "terrestre", "praia_semi_aberta", -27.73539, -48.50789, 105, free: true),
        Spot("matadeiro", "Matadeiro", "sul", "praia", "mar_aberto", "terrestre", "praia_semi_aberta", -27.7556, -48.49822, 115),
        Spot("pantano_do_sul", "Pântano do Sul", "sul", "praia", "mar_aberto", "terrestre", "praia_protegida", -27.77573, -48.50612, 145, free: true),
        Spot("acores", "Açores", "sul", "praia", "mar_aberto", "terrestre", "praia_semi_aberta", -27.7864, -48.526, 165),
        Spot("solidao", "Solidão", "sul", "praia", "mar_aberto", "trilha", "praia_semi_aberta", -27.8055, -48.532, 170),
        Spot("naufragados", "Naufragados", "sul", "praia", "mar_aberto", "trilha", "praia_aberta", -27.8336, -48.5639, 200),
        Spot("ribeirao", "Ribeirão da Ilha", "sul", "praia", "baia", "terrestre", "praia_protegida", -27.71773, -48.56266, 270, free: true),
        Spot("tapera", "Tapera", "sul", "praia", "baia", "terrestre", "praia_protegida", -27.6881, -48.5614, 270),
        Spot("caieira-da-barra-do-sul", "Caieira da Barra do Sul", "sul", "praia", "baia", "terrestre", "praia_protegida", -27.8128, -48.5642, 250),

        // Oeste
        Spot("santo-antonio-de-lisboa", "Santo Antônio de Lisboa", "oeste", "praia", "baia", "terrestre", "praia_protegida", -27.5086, -48.5203, 280),
        Spot("sambaqui", "Sambaqui", "oeste", "praia", "baia", "terrestre", "praia_protegida", -27.4906, -48.5231, 290),
        Spot("cacupe", "Cacupé", "oeste", "praia", "baia", "terrestre", "praia_protegida", -27.5214, -48.5158, 270),
        Spot("ratones", "Ratones", "oeste", "praia", "baia", "terrestre", "praia_protegida", -27.4780, -48.5080, 300),
        Spot("beira-mar-norte", "Beira-Mar Norte", "oeste", "praia", "baia", "terrestre", "praia_protegida", -27.5856, -48.5514, 280),

        // Ilhas — orientação omitida: uma ilha não tem um único azimute de mar
        Spot("ilha-do-campeche", "Ilha do Campeche", "ilhas", "ilha", "mar_aberto", "embarcado", "praia_aberta", -27.6953, -48.4658, null, free: true),
        Spot("ilha-do-xavier", "Ilha do Xavier", "ilhas", "ilha", "mar_aberto", "embarcado", "praia_aberta", -27.6097, -48.3853, null),
        Spot("ilha-das-aranhas", "Ilha das Aranhas", "ilhas", "ilha", "mar_aberto", "embarcado", "praia_aberta", -27.4864, -48.3647, null),
        Spot("ilha-das-campanhas", "Ilha das Campanhas", "ilhas", "ilha", "mar_aberto", "embarcado", "praia_aberta", null, null, null),
        Spot("ilha-dos-moleques-do-sul", "Ilha dos Moleques do Sul", "ilhas", "ilha", "mar_aberto", "embarcado", "praia_aberta", -27.8461, -48.4319, null),
        Spot("ilha-de-ratones-grande", "Ilha de Ratones Grande", "ilhas", "ilha", "baia", "embarcado", "praia_protegida", -27.4619, -48.5611, null),
        Spot("ilha-de-ratones-pequeno", "Ilha de Ratones Pequeno", "ilhas", "ilha", "baia", "embarcado", "praia_protegida", -27.4522, -48.5614, null),
        Spot("ilha-de-anhatomirim", "Ilha de Anhatomirim", "ilhas", "ilha", "baia", "embarcado", "praia_protegida", -27.4269, -48.5636, null, city: "Governador Celso Ramos"),
        Spot("ilha-das-cabras", "Ilha das Cabras", "ilhas", "ilha", "baia", "embarcado", "praia_protegida", null, null, null),

        // Continente / Grande Florianópolis
        Spot("rio-biguacu", "Rio Biguaçu", "continente", "rio", "estuarino", "misto", "praia_protegida", -27.4945, -48.6550, null, city: "Biguaçu"),
        Spot("rio-cubatao", "Rio Cubatão", "continente", "rio", "estuarino", "misto", "praia_protegida", -27.7200, -48.6500, null, city: "Palhoça"),
        Spot("praia-de-fora", "Praia de Fora", "continente", "praia", "baia", "terrestre", "praia_semi_aberta", -27.7356, -48.6389, 200, city: "Palhoça"),
        Spot("enseada-de-brito", "Enseada de Brito", "continente", "praia", "baia", "terrestre", "praia_protegida", -27.8036, -48.6167, 180, city: "Palhoça"),
        Spot("praia-de-sao-miguel", "Praia de São Miguel", "continente", "praia", "baia", "terrestre", "praia_protegida", -27.5064, -48.6583, 200, city: "Biguaçu")
    ];

    public static IReadOnlyList<string> PendingCoordinates { get; } =
        All.Where(item => item.Latitude is null || item.Longitude is null).Select(item => item.Name).ToArray();

    public static IReadOnlyList<string> PendingOrientation { get; } =
        All.Where(item => item.SeaOrientationDegrees is null).Select(item => item.Name).ToArray();

    public static OfficialSpotDefinition? FindMatch(IEnumerable<FishingSpot> spots, OfficialSpotDefinition item)
    {
        foreach (var spot in spots)
        {
            if (spot.Visibility != "official") continue;
            if (string.Equals(spot.Slug, item.Slug, StringComparison.OrdinalIgnoreCase)) return item;
            if (NamesMatch(spot.Name, item)) return item;
        }

        return null;
    }

    public static FishingSpot? ExistingMatch(IEnumerable<FishingSpot> spots, OfficialSpotDefinition item) =>
        spots.FirstOrDefault(spot =>
            spot.Visibility == "official"
            && (string.Equals(spot.Slug, item.Slug, StringComparison.OrdinalIgnoreCase) || NamesMatch(spot.Name, item)));

    public static FishingSpot ToSpot(OfficialSpotDefinition item) => new()
    {
        Slug = item.Slug,
        Name = item.Name,
        Description = item.Description,
        City = item.City,
        State = item.State,
        Region = item.Region,
        Type = item.Type,
        FishingEnvironment = item.FishingEnvironment,
        AccessType = item.AccessType,
        RestrictionNotes = item.RestrictionNotes,
        Visibility = "official",
        IsApproved = true,
        Latitude = item.Latitude,
        Longitude = item.Longitude,
        SeaOrientationDegrees = item.SeaOrientationDegrees,
        Profile = item.Profile,
        IsActive = true,
        IsFreeDefault = item.IsFreeDefault
    };

    public static void Complement(FishingSpot spot, OfficialSpotDefinition item)
    {
        var rawRegion = spot.Region?.Trim() ?? string.Empty;
        var normalizedRegion = SpotRules.NormalizeRegion(rawRegion);
        var legacyIslandLabel = rawRegion.Contains("da ilha", StringComparison.OrdinalIgnoreCase)
            || rawRegion.Contains("Florianópolis", StringComparison.OrdinalIgnoreCase)
            || string.Equals(rawRegion, "Florianopolis", StringComparison.OrdinalIgnoreCase);
        spot.Region = !SpotRules.IsValidSpotRegion(normalizedRegion) || legacyIslandLabel
            ? item.Region
            : normalizedRegion;
        if (!SpotRules.Types.Contains(spot.Type, StringComparer.Ordinal)
            || (spot.Type == SpotRules.DefaultType && item.Type != SpotRules.DefaultType))
        {
            spot.Type = item.Type;
        }
        if (!SpotRules.FishingEnvironments.Contains(spot.FishingEnvironment, StringComparer.Ordinal)
            || (spot.FishingEnvironment == SpotRules.DefaultFishingEnvironment && item.FishingEnvironment != SpotRules.DefaultFishingEnvironment))
        {
            spot.FishingEnvironment = item.FishingEnvironment;
        }
        if (!SpotRules.AccessTypes.Contains(spot.AccessType, StringComparer.Ordinal)
            || (spot.AccessType == SpotRules.DefaultAccessType && item.AccessType != SpotRules.DefaultAccessType))
        {
            spot.AccessType = item.AccessType;
        }
        if (string.IsNullOrWhiteSpace(spot.City)) spot.City = item.City;
        if (string.IsNullOrWhiteSpace(spot.State)) spot.State = item.State;
        if (string.IsNullOrWhiteSpace(spot.Description)) spot.Description = item.Description;
        if (string.IsNullOrWhiteSpace(spot.RestrictionNotes)) spot.RestrictionNotes = item.RestrictionNotes;
        if (spot.Latitude is null && item.Latitude is not null) spot.Latitude = item.Latitude;
        if (spot.Longitude is null && item.Longitude is not null) spot.Longitude = item.Longitude;
        if (spot.SeaOrientationDegrees is null && item.SeaOrientationDegrees is not null)
            spot.SeaOrientationDegrees = item.SeaOrientationDegrees;
        if (string.IsNullOrWhiteSpace(spot.Profile)) spot.Profile = item.Profile;
    }

    private static bool NamesMatch(string existingName, OfficialSpotDefinition item)
    {
        if (string.Equals(existingName, item.Name, StringComparison.OrdinalIgnoreCase)) return true;
        return item.Aliases is not null
            && item.Aliases.Any(alias => string.Equals(existingName, alias, StringComparison.OrdinalIgnoreCase));
    }

    private static OfficialSpotDefinition Spot(
        string slug,
        string name,
        string region,
        string type,
        string environment,
        string access,
        string profile,
        double? latitude,
        double? longitude,
        double? orientation,
        bool free = false,
        string city = "Florianópolis",
        string[]? aliases = null)
        => new(
            slug,
            name,
            region,
            type,
            environment,
            access,
            profile,
            latitude,
            longitude,
            orientation,
            free,
            city,
            "SC",
            null,
            null,
            aliases);
}
