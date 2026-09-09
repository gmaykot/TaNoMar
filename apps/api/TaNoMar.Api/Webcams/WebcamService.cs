using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Webcams;

internal sealed class WebcamService(
    TaNoMarDbContext db,
    WebcamProviderCatalog providers,
    IMemoryCache cache,
    IOptions<WebcamOptions> options,
    IHostEnvironment environment,
    ILogger<WebcamService> logger)
{
    public const string RequiredPlanLabel = "Capitão";

    public async Task<WebcamHttpResult> ViewAsync(User user, string spotId, CancellationToken cancellationToken)
    {
        var spot = await FindVisibleSpotAsync(spotId, user, cancellationToken);
        if (spot is null) return WebcamHttpResult.NotFound();
        var plan = await PlanAsync(user, cancellationToken);
        if (!plan.CanLiveWebcams)
        {
            logger.LogInformation("UnauthorizedWebcamAccess user={UserId} spot={SpotId} action=view", user.Id, spot.Slug);
            return ForbiddenPlan();
        }
        if (!await LiveWebcamsEnabledAsync(cancellationToken))
        {
            logger.LogInformation("UnauthorizedWebcamAccess user={UserId} spot={SpotId} action=feature", user.Id, spot.Slug);
            return WebcamHttpResult.FeatureDisabled();
        }

        var link = await ActiveLinkAsync(spot.Id, cancellationToken);
        if (link is null) return WebcamHttpResult.NotFound();
        return await PlaybackAsync(link, includePlayer: true, cancellationToken);
    }

    public async Task<WebcamHttpResult> GetLinkedAsync(User user, string spotId, CancellationToken cancellationToken)
    {
        var (spot, failure) = await AuthorizeManageAsync(user, spotId, cancellationToken);
        if (failure is not null) return failure;
        var link = await ActiveLinkAsync(spot!.Id, cancellationToken);
        if (link is null)
            return WebcamHttpResult.Ok(new { linked = false });
        return await PlaybackAsync(link, includePlayer: true, cancellationToken);
    }

    public async Task<WebcamHttpResult> SearchAsync(User user, string spotId, CancellationToken cancellationToken)
    {
        var (spot, failure) = await AuthorizeManageAsync(user, spotId, cancellationToken);
        if (failure is not null) return failure;
        if (spot!.Latitude is null || spot.Longitude is null)
            return WebcamHttpResult.BadRequest("webcam_location_missing", "Este local ainda não tem coordenadas para pesquisar câmeras próximas.");

        try
        {
            var search = providers.NearbySearchProvider;
            if (search is null) return WebcamHttpResult.NotConfigured();
            var radius = options.Value.EffectiveSearchRadiusKm;
            var items = await search.SearchNearbyAsync(spot.Latitude.Value, spot.Longitude.Value, radius, cancellationToken);
            logger.LogInformation(
                "WebcamSearch spot={SpotId} latitude={Latitude} longitude={Longitude} usable={Usable}",
                spot.Slug,
                spot.Latitude,
                spot.Longitude,
                items.Count);
            return SearchBody(items);
        }
        catch (WebcamNotConfiguredException)
        {
            return WebcamHttpResult.NotConfigured();
        }
        catch (WebcamProviderException exception)
        {
            logger.LogError(exception, "WebcamProviderError action=search spot={SpotId}", spot.Slug);
            return WebcamHttpResult.ProviderUnavailable();
        }
    }

    public async Task<WebcamHttpResult> LookupAsync(User user, string spotId, string? query, CancellationToken cancellationToken)
    {
        var (spot, failure) = await AuthorizeManageAsync(user, spotId, cancellationToken);
        if (failure is not null) return failure;
        var text = query?.Trim() ?? string.Empty;
        if (text.Length is 0 or > WebcamOptions.LookupQueryMaxLength
            || !YouTubeWebcamMapper.LooksLikeYouTubeQuery(text))
        {
            return WebcamHttpResult.BadRequest(
                "webcam_invalid",
                "Cole o link da transmissão ao vivo no YouTube.");
        }

        try
        {
            var source = providers.YouTubeProvider;
            if (source is null) return WebcamHttpResult.BadRequest("webcam_unknown_provider", "Este provedor de câmera ainda não está disponível.");
            var latitude = spot!.Latitude ?? 0;
            var longitude = spot.Longitude ?? 0;
            var items = await source.LookupAsync(text, latitude, longitude, cancellationToken);
            logger.LogInformation("WebcamLookup spot={SpotId} provider=youtube usable={Usable}", spot.Slug, items.Count);
            if (items.Count == 0)
            {
                return WebcamHttpResult.BadRequest(
                    "webcam_invalid",
                    "Não há transmissão ao vivo neste link. Cole uma live em andamento ou o canal do YouTube.");
            }

            return SearchBody(items);
        }
        catch (WebcamNotConfiguredException)
        {
            return WebcamHttpResult.NotConfigured();
        }
        catch (WebcamProviderException exception)
        {
            logger.LogError(exception, "WebcamProviderError action=lookup spot={SpotId}", spot!.Slug);
            return WebcamHttpResult.ProviderUnavailable();
        }
    }

    public async Task<WebcamHttpResult> LinkAsync(User user, string spotId, WebcamLinkRequest request, CancellationToken cancellationToken)
    {
        var (spot, failure) = await AuthorizeManageAsync(user, spotId, cancellationToken);
        if (failure is not null) return failure;
        var target = spot!;
        var providerId = request.Provider?.Trim().ToLowerInvariant();
        var externalId = request.ExternalId?.Trim();
        if (string.IsNullOrWhiteSpace(providerId) || string.IsNullOrWhiteSpace(externalId))
            return WebcamHttpResult.BadRequest("webcam_invalid", "Informe o provedor e o identificador da câmera.");
        var source = providers.Find(providerId);
        if (source is null)
            return WebcamHttpResult.BadRequest("webcam_unknown_provider", "Este provedor de câmera ainda não está disponível.");
        if (environment.IsDevelopment())
            logger.LogInformation("WebcamLink validating externalId={ExternalId} provider={Provider}", externalId, providerId);

        WebcamProviderDetails? details;
        try
        {
            details = await source.GetAsync(externalId, cancellationToken);
        }
        catch (WebcamNotConfiguredException)
        {
            return WebcamHttpResult.NotConfigured();
        }
        catch (WebcamProviderException exception)
        {
            logger.LogError(exception, "WebcamProviderError action=link spot={SpotId} externalId={ExternalId}", target.Slug, externalId);
            return WebcamHttpResult.ProviderUnavailable();
        }

        if (details is null || !string.Equals(details.Provider, providerId, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(details.ExternalId, externalId, StringComparison.Ordinal)
            || !details.IsUsable)
        {
            logger.LogInformation("WebcamLink rejected externalId={ExternalId} valid={Valid}", externalId, details?.IsUsable == true);
            return WebcamHttpResult.BadRequest("webcam_invalid", "Essa câmera não está disponível para transmissão ao vivo.");
        }

        var now = DateTimeOffset.UtcNow;
        var current = await db.FishingSpotWebcams
            .Where(item => item.FishingSpotId == target.Id)
            .ToListAsync(cancellationToken);
        foreach (var item in current.Where(item => item.IsActive
                     && !(string.Equals(item.Provider, details.Provider, StringComparison.OrdinalIgnoreCase)
                          && item.ExternalId == details.ExternalId)))
        {
            item.IsActive = false;
            item.UpdatedAt = now;
        }

        var match = current.FirstOrDefault(item =>
            string.Equals(item.Provider, details.Provider, StringComparison.OrdinalIgnoreCase)
            && item.ExternalId == details.ExternalId);
        if (match is null)
        {
            match = new FishingSpotWebcam
            {
                FishingSpotId = target.Id,
                Provider = details.Provider,
                ExternalId = details.ExternalId,
                CreatedAt = now,
                CreatedByUserId = user.Id
            };
            db.FishingSpotWebcams.Add(match);
        }

        match.Name = details.Name;
        match.Latitude = details.Latitude;
        match.Longitude = details.Longitude;
        match.IsActive = true;
        match.IsAvailable = true;
        match.LastAvailabilityCheck = now;
        match.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        RememberPlayer(match, details.EmbedUrl, details.PreviewUrl);
        logger.LogInformation(
            "WebcamLinked spot={SpotId} provider={Provider} externalId={ExternalId} user={UserId}",
            target.Slug,
            match.Provider,
            match.ExternalId,
            user.Id);
        return await PlaybackAsync(match, includePlayer: true, cancellationToken);
    }

    public async Task<WebcamHttpResult> UnlinkAsync(User user, string spotId, CancellationToken cancellationToken)
    {
        var (spot, failure) = await AuthorizeManageAsync(user, spotId, cancellationToken);
        if (failure is not null) return failure;
        var target = spot!;
        var current = await db.FishingSpotWebcams
            .Where(item => item.FishingSpotId == target.Id && item.IsActive)
            .ToListAsync(cancellationToken);
        if (current.Count == 0) return WebcamHttpResult.NotFound();
        var now = DateTimeOffset.UtcNow;
        foreach (var item in current)
        {
            item.IsActive = false;
            item.UpdatedAt = now;
            cache.Remove(PlayerCacheKey(item.Provider, item.ExternalId));
            logger.LogInformation(
                "WebcamRemoved spot={SpotId} provider={Provider} externalId={ExternalId} user={UserId}",
                target.Slug,
                item.Provider,
                item.ExternalId,
                user.Id);
        }
        await db.SaveChangesAsync(cancellationToken);
        return WebcamHttpResult.NoContent();
    }

    private async Task<WebcamHttpResult> PlaybackAsync(FishingSpotWebcam link, bool includePlayer, CancellationToken cancellationToken)
    {
        var cacheMinutes = options.Value.EffectiveAvailabilityCacheMinutes;
        var stale = link.LastAvailabilityCheck is null
            || DateTimeOffset.UtcNow - link.LastAvailabilityCheck.Value > TimeSpan.FromMinutes(cacheMinutes);
        string? embedUrl = null;
        string? previewUrl = null;
        if (!stale && cache.TryGetValue(PlayerCacheKey(link.Provider, link.ExternalId), out WebcamPlayerCache? cached)
            && cached is not null)
        {
            embedUrl = cached.EmbedUrl;
            previewUrl = cached.PreviewUrl;
        }

        if (stale || (includePlayer && string.IsNullOrWhiteSpace(embedUrl)))
        {
            try
            {
                var source = providers.Find(link.Provider);
                if (source is null)
                {
                    embedUrl = null;
                    previewUrl = null;
                    logger.LogInformation(
                        "WebcamUnavailable spotWebcam={Id} provider={Provider} externalId={ExternalId}",
                        link.Id,
                        link.Provider,
                        link.ExternalId);
                }
                else
                {
                    var details = await source.GetAsync(link.ExternalId, cancellationToken);
                    var usable = details is not null
                        && string.Equals(details.Provider, link.Provider, StringComparison.OrdinalIgnoreCase)
                        && details.IsUsable;
                    link.IsAvailable = usable;
                    link.LastAvailabilityCheck = DateTimeOffset.UtcNow;
                    link.UpdatedAt = DateTimeOffset.UtcNow;
                    if (usable)
                    {
                        link.Name = details!.Name;
                        link.Latitude = details.Latitude;
                        link.Longitude = details.Longitude;
                        RememberPlayer(link, details.EmbedUrl, details.PreviewUrl);
                        embedUrl = details.EmbedUrl;
                        previewUrl = details.PreviewUrl;
                    }
                    else
                    {
                        cache.Remove(PlayerCacheKey(link.Provider, link.ExternalId));
                        embedUrl = null;
                        previewUrl = null;
                        logger.LogInformation(
                            "WebcamUnavailable spotWebcam={Id} provider={Provider} externalId={ExternalId}",
                            link.Id,
                            link.Provider,
                            link.ExternalId);
                    }
                    await db.SaveChangesAsync(cancellationToken);
                }
            }
            catch (WebcamNotConfiguredException)
            {
                embedUrl = null;
                previewUrl = null;
            }
            catch (WebcamProviderException exception)
            {
                logger.LogError(exception, "WebcamProviderError action=status externalId={ExternalId}", link.ExternalId);
                embedUrl = null;
                previewUrl = null;
            }
        }

        var available = link.IsAvailable && !string.IsNullOrWhiteSpace(embedUrl);
        return WebcamHttpResult.Ok(new
        {
            linked = true,
            provider = link.Provider,
            externalId = link.ExternalId,
            name = link.Name,
            providerDisplayName = providers.DisplayName(link.Provider),
            latitude = link.Latitude,
            longitude = link.Longitude,
            isAvailable = available,
            isLive = available,
            previewUrl,
            player = includePlayer && available
                ? new { kind = "embed", embedUrl }
                : null
        });
    }

    private async Task<(FishingSpot? spot, WebcamHttpResult? failure)> AuthorizeManageAsync(
        User user,
        string spotId,
        CancellationToken cancellationToken)
    {
        var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == spotId, cancellationToken);
        if (spot is null) return (null, WebcamHttpResult.NotFound());
        if (!SpotRules.IsAdmin(user))
        {
            logger.LogInformation("UnauthorizedWebcamAccess user={UserId} spot={SpotId} action=admin", user.Id, spot.Slug);
            return (null, WebcamHttpResult.Forbidden("forbidden", "Apenas administradores incluem câmeras nos locais."));
        }
        return (spot, null);
    }

    private async Task<bool> LiveWebcamsEnabledAsync(CancellationToken cancellationToken)
    {
        var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        return settings is null || settings.ShowLiveWebcams;
    }

    private Task<FishingSpot?> FindVisibleSpotAsync(string spotId, User user, CancellationToken cancellationToken) =>
        db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(
            item => item.Slug == spotId && (item.Visibility == "official" || (item.Visibility == "shared" && item.IsApproved) || item.OwnerUserId == user.Id),
            cancellationToken);

    private Task<FishingSpotWebcam?> ActiveLinkAsync(Guid fishingSpotId, CancellationToken cancellationToken) =>
        db.FishingSpotWebcams.SingleOrDefaultAsync(
            item => item.FishingSpotId == fishingSpotId && item.IsActive,
            cancellationToken);

    private Task<Plan> PlanAsync(User user, CancellationToken cancellationToken) =>
        db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);

    private static WebcamHttpResult SearchBody(IEnumerable<WebcamSearchHit> items) =>
        WebcamHttpResult.Ok(new
        {
            items = items.Select(item => new
            {
                provider = item.Provider,
                externalId = item.ExternalId,
                name = item.Name,
                latitude = item.Latitude,
                longitude = item.Longitude,
                distanceKm = item.DistanceKm,
                isLive = item.IsLive,
                hasPlayer = item.HasPlayer,
                previewUrl = item.PreviewUrl,
                providerDisplayName = item.ProviderDisplayName
            })
        });

    private static WebcamHttpResult ForbiddenPlan() =>
        WebcamHttpResult.Forbidden(
            "plan_required",
            "Câmeras ao vivo exigem o plano Capitão.",
            RequiredPlanLabel);

    private void RememberPlayer(FishingSpotWebcam link, string? embedUrl, string? previewUrl)
    {
        if (string.IsNullOrWhiteSpace(embedUrl)) return;
        cache.Set(
            PlayerCacheKey(link.Provider, link.ExternalId),
            new WebcamPlayerCache(embedUrl, previewUrl),
            TimeSpan.FromMinutes(options.Value.EffectiveAvailabilityCacheMinutes));
    }

    private static string PlayerCacheKey(string provider, string externalId) =>
        $"webcam:player:{provider}:{externalId}";
}
