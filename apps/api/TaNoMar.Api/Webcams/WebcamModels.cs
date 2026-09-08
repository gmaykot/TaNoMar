namespace TaNoMar.Api.Webcams;

internal sealed record WebcamSearchHit(
    string Provider,
    string ExternalId,
    string Name,
    double Latitude,
    double Longitude,
    double DistanceKm,
    bool IsLive,
    bool HasPlayer,
    string? PreviewUrl,
    string ProviderDisplayName);

internal sealed record WebcamProviderDetails(
    string Provider,
    string ExternalId,
    string Name,
    double Latitude,
    double Longitude,
    bool IsLive,
    bool HasPlayer,
    string? EmbedUrl,
    string? PreviewUrl,
    string ProviderDisplayName)
{
    public bool IsUsable =>
        !string.IsNullOrWhiteSpace(ExternalId)
        && !string.IsNullOrWhiteSpace(Name)
        && HasPlayer
        && IsLive
        && IsHttps(EmbedUrl);

    private static bool IsHttps(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps;
}

internal sealed record WebcamLinkRequest(string? Provider, string? ExternalId);

internal sealed record WebcamHttpResult(int Status, object? Body = null)
{
    public static WebcamHttpResult Ok(object body) => new(200, body);
    public static WebcamHttpResult NoContent() => new(204);
    public static WebcamHttpResult BadRequest(string code, string detail) =>
        new(400, new { code, detail });
    public static WebcamHttpResult Forbidden(string code, string detail, string? requiredPlan = null) =>
        new(403, requiredPlan is null ? new { code, detail } : new { code, detail, requiredPlan });
    public static WebcamHttpResult NotFound() => new(404);
    public static WebcamHttpResult ProviderUnavailable() =>
        new(502, new
        {
            code = "webcam_provider_unavailable",
            detail = "Não foi possível consultar as câmeras agora. Tente novamente em alguns minutos."
        });
    public static WebcamHttpResult FeatureDisabled() =>
        new(403, new
        {
            code = "feature_disabled",
            detail = "Câmeras ao vivo estão desligadas no momento."
        });
    public static WebcamHttpResult NotConfigured() =>
        new(503, new
        {
            code = "webcam_unconfigured",
            detail = "A pesquisa de câmeras ao vivo não está disponível neste ambiente."
        });

    public IResult ToResult() => Status switch
    {
        200 => Results.Ok(Body),
        204 => Results.NoContent(),
        400 => Results.BadRequest(Body),
        403 => Results.Json(Body, statusCode: 403),
        404 => Results.NotFound(),
        502 => Results.Json(Body, statusCode: 502),
        503 => Results.Json(Body, statusCode: 503),
        _ => Results.Json(Body, statusCode: Status)
    };
}
