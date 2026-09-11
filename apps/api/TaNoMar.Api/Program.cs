using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Auth;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using TaNoMar.Api.Notifications;
using TaNoMar.Api.Options;
using TaNoMar.Api.Webcams;
using TaNoMar.Api.Workers;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<TaNoMarOptions>(builder.Configuration.GetSection(TaNoMarOptions.SectionName));
builder.Services.PostConfigure<TaNoMarOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.BootstrapAdminEmail))
        options.BootstrapAdminEmail = builder.Configuration["BOOTSTRAP_ADMIN_EMAIL"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.BootstrapAdminGoogleSubject))
        options.BootstrapAdminGoogleSubject = builder.Configuration["BOOTSTRAP_ADMIN_GOOGLE_SUBJECT"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.VapidPublicKey))
        options.VapidPublicKey = builder.Configuration["VAPID_PUBLIC_KEY"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.VapidPrivateKey))
        options.VapidPrivateKey = builder.Configuration["VAPID_PRIVATE_KEY"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.VapidSubject))
        options.VapidSubject = builder.Configuration["VAPID_SUBJECT"] ?? string.Empty;
});
builder.Services.Configure<FishingOptions>(builder.Configuration.GetSection(FishingOptions.SectionName));
builder.Services.PostConfigure<FishingOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.TabuaMareApiKey))
        options.TabuaMareApiKey = builder.Configuration["TABUA_MARE_API_KEY"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.TabuaMareBaseUrl))
        options.TabuaMareBaseUrl = builder.Configuration["TABUA_MARE_BASE_URL"] ?? "https://tabuamare.api.br/api/v2";
    if (string.IsNullOrWhiteSpace(options.GeoapifyApiKey))
        options.GeoapifyApiKey = builder.Configuration["GEOAPIFY_API_KEY"] ?? string.Empty;
});
builder.Services.Configure<BillingOptions>(builder.Configuration.GetSection(BillingOptions.SectionName));
builder.Services.PostConfigure<BillingOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.AsaasApiKey))
        options.AsaasApiKey = builder.Configuration["ASAAS_API_KEY"] ?? string.Empty;
    options.AsaasApiKey = BillingOptions.NormalizeApiKey(options.AsaasApiKey);
    if (string.IsNullOrWhiteSpace(options.AsaasBaseUrl))
        options.AsaasBaseUrl = builder.Configuration["ASAAS_BASE_URL"] ?? "https://api.asaas.com/v3";
    if (string.IsNullOrWhiteSpace(options.AsaasWebhookToken))
        options.AsaasWebhookToken = builder.Configuration["ASAAS_WEBHOOK_TOKEN"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.PublicAppOrigin))
        options.PublicAppOrigin = builder.Configuration["PUBLIC_APP_ORIGIN"] ?? string.Empty;
});
builder.Services.Configure<WebcamOptions>(builder.Configuration.GetSection(WebcamOptions.SectionName));
builder.Services.PostConfigure<WebcamOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.WindyApiKey))
        options.WindyApiKey = builder.Configuration["WINDY_WEBCAMS_API_KEY"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.YouTubeApiKey))
        options.YouTubeApiKey = builder.Configuration["YOUTUBE_API_KEY"] ?? string.Empty;
});
builder.Services.Configure<ResendOptions>(builder.Configuration.GetSection(ResendOptions.SectionName));
builder.Services.PostConfigure<ResendOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.ApiKey))
        options.ApiKey = builder.Configuration["RESEND_API_KEY"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.FromEmail))
        options.FromEmail = builder.Configuration["RESEND_FROM_EMAIL"] ?? string.Empty;
    if (!string.IsNullOrWhiteSpace(builder.Configuration["RESEND_FROM_NAME"]))
        options.FromName = builder.Configuration["RESEND_FROM_NAME"]!;
    if (string.IsNullOrWhiteSpace(options.NotificationEmail))
        options.NotificationEmail = builder.Configuration["RESEND_NOTIFICATION_EMAIL"]
            ?? builder.Configuration[$"{TaNoMarOptions.SectionName}:BootstrapAdminEmail"]
            ?? builder.Configuration["BOOTSTRAP_ADMIN_EMAIL"]
            ?? string.Empty;
});
builder.Services.Configure<WhatsAppOptions>(builder.Configuration.GetSection(WhatsAppOptions.SectionName));
builder.Services.PostConfigure<WhatsAppOptions>(options =>
{
    if (!options.Enabled && bool.TryParse(builder.Configuration["WHATSAPP_ENABLED"], out var enabled))
        options.Enabled = enabled;
    if (string.IsNullOrWhiteSpace(options.BaseUrl))
        options.BaseUrl = builder.Configuration["WHATSAPP_BASE_URL"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.ApiKey))
        options.ApiKey = builder.Configuration["WHATSAPP_API_KEY"] ?? string.Empty;
});
builder.Services.AddDbContext<TaNoMarDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<AuthTokenService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<FishingForecastCache>();
builder.Services.AddHttpClient<OpenMeteoClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<TabuaMareClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<GeoapifyClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<AsaasClient>((provider, client) =>
{
    var billing = provider.GetRequiredService<IOptions<BillingOptions>>().Value;
    var baseUrl = string.IsNullOrWhiteSpace(billing.AsaasBaseUrl)
        ? "https://api.asaas.com/v3"
        : billing.AsaasBaseUrl.Trim().TrimEnd('/');
    client.BaseAddress = new Uri(baseUrl + "/");
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<ResendEmailNotifier>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<BaileysWhatsAppGateway>((provider, client) =>
{
    var whatsApp = provider.GetRequiredService<IOptions<WhatsAppOptions>>().Value;
    var baseUrl = string.IsNullOrWhiteSpace(whatsApp.BaseUrl)
        ? "http://127.0.0.1:3000/"
        : whatsApp.BaseUrl.Trim().TrimEnd('/') + "/";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(8);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddTransient<IWhatsAppGateway>(provider => provider.GetRequiredService<BaileysWhatsAppGateway>());
builder.Services.AddSingleton<IAdminNotificationFormatter, AdminNotificationFormatter>();
builder.Services.AddTransient<IAdminNotificationChannel>(provider => provider.GetRequiredService<ResendEmailNotifier>());
builder.Services.AddTransient<IAdminNotificationChannel, WhatsAppNotificationChannel>();
builder.Services.AddScoped<AdminNotificationDispatcher>();
builder.Services.AddScoped<WhatsAppAdminService>();
builder.Services.AddSingleton<AdminNotificationQueue>();
builder.Services.AddSingleton<IAdminNotificationService>(provider => provider.GetRequiredService<AdminNotificationQueue>());
builder.Services.AddHostedService<AdminNotificationWorker>();
builder.Services.AddScoped<BillingService>();
builder.Services.AddHttpClient<WindyWebcamProvider>((provider, client) =>
{
    var webcams = provider.GetRequiredService<IOptions<WebcamOptions>>().Value;
    var baseUrl = string.IsNullOrWhiteSpace(webcams.WindyBaseUrl)
        ? "https://api.windy.com/webcams/api/v3/"
        : webcams.WindyBaseUrl.Trim();
    if (!baseUrl.EndsWith('/')) baseUrl += "/";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddHttpClient<YouTubeWebcamProvider>((provider, client) =>
{
    var webcams = provider.GetRequiredService<IOptions<WebcamOptions>>().Value;
    var baseUrl = string.IsNullOrWhiteSpace(webcams.YouTubeBaseUrl)
        ? "https://www.googleapis.com/youtube/v3/"
        : webcams.YouTubeBaseUrl.Trim();
    if (!baseUrl.EndsWith('/')) baseUrl += "/";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddTransient<IWebcamProvider>(provider => provider.GetRequiredService<WindyWebcamProvider>());
builder.Services.AddTransient<IWebcamProvider>(provider => provider.GetRequiredService<YouTubeWebcamProvider>());
builder.Services.AddScoped<WebcamProviderCatalog>();
builder.Services.AddScoped<WebcamService>();
builder.Services.AddTransient<FishingForecastService>();
builder.Services.AddSingleton<WorkerSettingsService>();
builder.Services.AddSingleton<FishingForecastRefreshQueue>();
builder.Services.AddSingleton<FishingTideEnrichmentQueue>();
builder.Services.AddHostedService<FishingForecastRefreshWorker>();
builder.Services.AddHostedService<FishingTideEnrichmentWorker>();
builder.Services.AddHostedService<FishingForecastWarmupWorker>();
builder.Services.AddHostedService<ForecastAlertWorker>();
builder.Services.AddHostedService<BillingPeriodWorker>();
builder.Services.AddSingleton<NotificationRealtimeHub>();
builder.Services.AddSingleton<WebPushQueue>();
builder.Services.AddHttpClient<Lib.Net.Http.WebPush.PushServiceClient>();
builder.Services.AddHostedService<WebPushDispatchWorker>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    var taNoMar = builder.Configuration.GetSection(TaNoMarOptions.SectionName).Get<TaNoMarOptions>() ?? new();
    var key = string.IsNullOrWhiteSpace(taNoMar.JwtKey) ? builder.Configuration["JWT_KEY"] : taNoMar.JwtKey;
    if (string.IsNullOrWhiteSpace(key))
        throw new InvalidOperationException("TaNoMar__JwtKey/JWT_KEY precisa ser configurado.");
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = taNoMar.JwtIssuer,
        ValidateAudience = true,
        ValidAudience = taNoMar.JwtIssuer,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(key)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("community", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "anonymous", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("places", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "anonymous", _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("webcams", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "anonymous", _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    await TaNoMarDbSeeder.SeedAsync(scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>());
}
app.UseForwardedHeaders();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/v1") && !context.Request.Path.StartsWithSegments("/api/v1/public"))
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.CacheControl = "private, no-store";
            return Task.CompletedTask;
        });
    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    var webcamOptions = app.Services.GetRequiredService<IOptions<WebcamOptions>>().Value;
    app.Logger.LogInformation("Windy configurado: {Configured}", webcamOptions.IsWindyConfigured ? "Sim" : "Não");
    app.Logger.LogInformation("YouTube configurado: {Configured}", webcamOptions.IsYouTubeConfigured ? "Sim" : "Não");
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", at = DateTimeOffset.UtcNow }));

var api = app.MapGroup("/api/v1");
WebcamEndpoints.Map(api);
WhatsAppEndpoints.Map(api);
api.MapPost("/auth/google", async (GoogleLoginRequest request, TaNoMarDbContext db, AuthTokenService tokens, IAdminNotificationService adminNotifications, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, HttpContext context, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Credential)) return Results.BadRequest(new { title = "Credencial ausente." });
    GoogleJsonWebSignature.Payload payload;
    try
    {
        payload = await GoogleJsonWebSignature.ValidateAsync(request.Credential, new GoogleJsonWebSignature.ValidationSettings { Audience = [options.Value.GoogleClientId] });
    }
    catch (Exception exception) when (exception is InvalidJwtException or InvalidOperationException)
    {
        return Results.Unauthorized();
    }
    var user = await db.Users.SingleOrDefaultAsync(item => item.GoogleSubject == payload.Subject, cancellationToken);
    var created = user is null;
    if (user is null)
    {
        user = new User { GoogleSubject = payload.Subject, Name = payload.Name ?? payload.Email, Email = payload.Email, PictureUrl = payload.Picture };
        db.Users.Add(user);
    }
    else
    {
        user.Name = payload.Name ?? user.Name;
        user.Email = payload.Email;
        user.PictureUrl = payload.Picture;
    }
    ApplyBootstrapAdmin(user, payload.Email, payload.Subject, options.Value, assignDefaultPlan: created);
    if (!user.IsActive) return Results.Forbid();
    var totalUsers = created ? await db.Users.CountAsync(cancellationToken) + 1 : 0;
    var refresh = tokens.CreateRefreshToken();
    db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = tokens.HashRefreshToken(refresh), ExpiresAt = DateTimeOffset.UtcNow.AddDays(options.Value.RefreshTokenDays) });
    await db.SaveChangesAsync(cancellationToken);
    if (created)
        adminNotifications.NotifyNewUserRegistered(
            user.Name,
            user.Email,
            user.CreatedAt,
            totalUsers);
    SetRefreshCookie(context, refresh, app.Environment.IsDevelopment());
    return Results.Ok(new { accessToken = tokens.IssueAccessToken(user) });
});

api.MapPost("/auth/refresh", async (TaNoMarDbContext db, AuthTokenService tokens, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, HttpContext context, CancellationToken cancellationToken) =>
{
    var raw = context.Request.Cookies[TaNoMarOptions.RefreshCookieName];
    if (string.IsNullOrWhiteSpace(raw)) return Results.Unauthorized();
    var token = await db.RefreshTokens.SingleOrDefaultAsync(item => item.TokenHash == tokens.HashRefreshToken(raw) && item.RevokedAt == null && item.ExpiresAt > DateTimeOffset.UtcNow, cancellationToken);
    if (token is null) return Results.Unauthorized();
    var user = await db.Users.FindAsync([token.UserId], cancellationToken);
    if (user is null || !user.IsActive) return Results.Unauthorized();
    token.RevokedAt = DateTimeOffset.UtcNow;
    var replacement = tokens.CreateRefreshToken();
    db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = tokens.HashRefreshToken(replacement), ExpiresAt = DateTimeOffset.UtcNow.AddDays(options.Value.RefreshTokenDays) });
    await db.SaveChangesAsync(cancellationToken);
    SetRefreshCookie(context, replacement, app.Environment.IsDevelopment());
    return Results.Ok(new { accessToken = tokens.IssueAccessToken(user) });
});

api.MapPost("/auth/logout", async (TaNoMarDbContext db, AuthTokenService tokens, HttpContext context, CancellationToken cancellationToken) =>
{
    var raw = context.Request.Cookies[TaNoMarOptions.RefreshCookieName];
    if (!string.IsNullOrWhiteSpace(raw))
    {
        var token = await db.RefreshTokens.SingleOrDefaultAsync(item => item.TokenHash == tokens.HashRefreshToken(raw), cancellationToken);
        if (token is not null) { token.RevokedAt = DateTimeOffset.UtcNow; await db.SaveChangesAsync(cancellationToken); }
    }
    context.Response.Cookies.Delete(TaNoMarOptions.RefreshCookieName, new CookieOptions { HttpOnly = true, Secure = !app.Environment.IsDevelopment(), SameSite = SameSiteMode.Lax, Path = "/api/v1/auth" });
    return Results.NoContent();
});

api.MapGet("/me", async (ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (ApplyBootstrapAdmin(user, user.Email, user.GoogleSubject, options.Value))
        await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(await UserDtoAsync(user, db, billing, cancellationToken));
}).RequireAuthorization();

api.MapGet("/plans", async (bool? includeFree, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var plans = await db.Plans.AsNoTracking()
        .Where(plan => (includeFree == true || plan.Code != PlanRules.Free) && plan.IsEnabled)
        .OrderBy(plan => plan.SortOrder)
        .ThenBy(plan => plan.Name)
        .ToListAsync(cancellationToken);
    return Results.Ok(plans.Select(PlanRules.CatalogDto).ToList());
});

api.MapGet("/billing/catalog", async (ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    return Results.Ok(await billing.CatalogAsync(user, cancellationToken));
}).RequireAuthorization();

api.MapPost("/billing/checkout", async (BillingCheckoutRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, HttpContext http, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var origin = billing.PublicOrigin($"{http.Request.Scheme}://{http.Request.Host.Value}");
    return await billing.CreateCheckoutAsync(user, request.PlanCode, request.Cycle, origin, cancellationToken);
}).RequireAuthorization();

api.MapGet("/billing/subscription", async (ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    return Results.Ok(await billing.SubscriptionAsync(user, cancellationToken));
}).RequireAuthorization();

api.MapPost("/billing/subscription/cancel", async (ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    return await billing.CancelAsync(user, cancellationToken);
}).RequireAuthorization();

api.MapPost("/webhooks/asaas", async (HttpRequest request, BillingService billing, CancellationToken cancellationToken) =>
{
    var token = request.Headers["asaas-access-token"].ToString();
    JsonElement payload;
    try
    {
        using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: cancellationToken);
        payload = document.RootElement.Clone();
    }
    catch (JsonException)
    {
        return Results.BadRequest();
    }
    return await billing.HandleWebhookAsync(token, payload, cancellationToken);
});

api.MapGet("/fishing-spots", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var favoriteIds = await db.FavoriteSpots.Where(item => item.UserId == user.Id).Select(item => item.FishingSpotId).ToListAsync(cancellationToken);
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    var idealWindSettings = await IdealWindSettingsAsync(db, user.Id, cancellationToken);
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    var spots = await db.FishingSpots.AsNoTracking()
        .Where(spot => (spot.Visibility == "official" && spot.IsActive) || (spot.Visibility == "shared" && spot.IsApproved) || spot.OwnerUserId == user.Id)
        .OrderBy(spot => spot.Name)
        .ToListAsync(cancellationToken);
    var webcamSpotIds = await VisibleWebcamSpotIdsAsync(db, cancellationToken);
    return Results.Ok(spots
        .Where(spot => SpotRules.Owns(spot, user) || (SpotRules.CanSee(spot, user) && SpotRules.IsInPreferredRegion(spot, preferredRegions)))
        .Select(spot => SpotDtoProjection(spot, user, favoriteIds.Contains(spot.Id), SpotRules.IsEnabledForUser(spot, enabledSettings), webcamSpotIds.Contains(spot.Id), idealWindSettings.GetValueOrDefault(spot.Id)))
        .ToList());
}).RequireAuthorization();

api.MapPost("/fishing-spots", async (PersonalSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var currentCount = await db.FishingSpots.CountAsync(spot => spot.OwnerUserId == user.Id, cancellationToken);
    if (currentCount >= plan.MaxPersonalSpots) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais locais pessoais." });
    if (request.Latitude is null || request.Longitude is null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Region)) return Results.BadRequest(new { detail = "Nome, região e coordenadas são obrigatórios." });
    if (!SpotRules.IsValidSpotRegion(request.Region)) return Results.BadRequest(new { detail = "Informe uma região válida: norte, sul, leste, oeste, continente ou ilhas." });
    var existingSpots = await db.FishingSpots.AsNoTracking().ToListAsync(cancellationToken);
    if (IsDuplicateSpot(existingSpots, request.Name.Trim(), request.Latitude, request.Longitude))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    var shared = request.Shared;
    var spot = new FishingSpot
    {
        Slug = $"pessoal-{Guid.NewGuid():N}",
        Name = request.Name.Trim(),
        Description = request.Description,
        City = request.City ?? "",
        State = request.State ?? "SC",
        Region = SpotRules.NormalizeRegion(request.Region),
        Type = SpotRules.NormalizeType(null),
        FishingEnvironment = SpotRules.DefaultFishingEnvironment,
        AccessType = SpotRules.DefaultAccessType,
        Visibility = shared ? "shared" : "private",
        IsApproved = !shared,
        OwnerUserId = user.Id,
        Latitude = request.Latitude,
        Longitude = request.Longitude,
        SeaOrientationDegrees = request.SeaOrientationDegrees,
        Profile = SpotRules.NormalizeProfile(request.Profile)
    };
    db.FishingSpots.Add(spot);
    db.EnabledSpots.Add(new EnabledSpot { UserId = user.Id, FishingSpotId = spot.Id, IsEnabled = true });
    await db.SaveChangesAsync(cancellationToken);
    QueueForecastRefresh(forecastQueue, spot);
    return Results.Created($"/api/v1/fishing-spots/{spot.Slug}", SpotDtoProjection(spot, user, false, true, false));
}).RequireAuthorization();

api.MapPut("/fishing-spots/{id}", async (string id, PersonalSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, FishingForecastCache cache, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.Owns(spot, user) || spot.Visibility == "official") return Results.Forbid();
    if (request.Latitude is null || request.Longitude is null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Region)) return Results.BadRequest(new { detail = "Nome, região e coordenadas são obrigatórios." });
    if (!SpotRules.IsValidSpotRegion(request.Region)) return Results.BadRequest(new { detail = "Informe uma região válida: norte, sul, leste, oeste, continente ou ilhas." });
    var others = await db.FishingSpots.AsNoTracking().Where(item => item.Id != spot.Id).ToListAsync(cancellationToken);
    if (IsDuplicateSpot(others, request.Name.Trim(), request.Latitude, request.Longitude))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    var forecastInputsChanged = SpotRules.ForecastInputsChanged(
        spot,
        request.Latitude,
        request.Longitude,
        request.SeaOrientationDegrees,
        request.Profile);
    ApplyPersonalSpot(spot, request);
    await db.SaveChangesAsync(cancellationToken);
    if (forecastInputsChanged)
    {
        await cache.InvalidateLocationAsync(spot.Slug, cancellationToken);
        QueueForecastRefresh(forecastQueue, spot);
    }
    var favorite = await db.FavoriteSpots.AnyAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    var idealWindSettings = await IdealWindSettingsAsync(db, user.Id, cancellationToken);
    var hasLiveWebcam = await ShowLiveWebcamsEnabledAsync(db, cancellationToken)
        && await db.FishingSpotWebcams.AnyAsync(item => item.FishingSpotId == spot.Id && item.IsActive, cancellationToken);
    return Results.Ok(SpotDtoProjection(spot, user, favorite, SpotRules.IsEnabledForUser(spot, enabledSettings), hasLiveWebcam, idealWindSettings.GetValueOrDefault(spot.Id)));
}).RequireAuthorization();

api.MapDelete("/fishing-spots/{id}", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastCache cache, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.Owns(spot, user) || spot.Visibility == "official") return Results.Forbid();
    var slug = spot.Slug;
    await RemoveSpotDependentsAsync(db, spot.Id, cancellationToken);
    db.FishingSpots.Remove(spot);
    await db.SaveChangesAsync(cancellationToken);
    await cache.InvalidateLocationAsync(slug, cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/places/autocomplete", async (string? q, ClaimsPrincipal principal, TaNoMarDbContext db, GeoapifyClient geoapify, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var text = q?.Trim() ?? string.Empty;
    if (text.Length is < 3 or > 80)
        return Results.BadRequest(new { detail = "Informe entre 3 e 80 caracteres para buscar um lugar." });
    var items = await geoapify.AutocompleteAsync(text, cancellationToken);
    return Results.Ok(new { items });
}).RequireAuthorization().RequireRateLimiting("places");

api.MapGet("/admin/fishing-spots/pending", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spots = await db.FishingSpots.AsNoTracking().Where(spot => spot.Visibility == "shared" && !spot.IsApproved).OrderBy(spot => spot.CreatedAt).ToListAsync(cancellationToken);
    var webcamSpotIds = await VisibleWebcamSpotIdsAsync(db, cancellationToken);
    return Results.Ok(spots.Select(spot => SpotDtoProjection(spot, actor!, false, null, webcamSpotIds.Contains(spot.Id))).ToList());
}).RequireAuthorization();

api.MapGet("/admin/fishing-audit", async (
    string? spotId,
    DateOnly? date,
    bool refreshSources,
    ClaimsPrincipal principal,
    TaNoMarDbContext db,
    FishingForecastService fishing,
    CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var slug = spotId?.Trim();
    if (string.IsNullOrWhiteSpace(slug))
        return Results.BadRequest(new { detail = "Informe spotId para auditar um local." });

    var spot = await db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == slug, cancellationToken);
    if (spot is null) return Results.NotFound();
    var targetDate = date ?? fishing.Today();
    var location = FishingForecastService.ToFishingLocation(spot);
    var sourceReport = refreshSources
        ? await fishing.AuditLocationDayAsync(location, targetDate, cancellationToken)
        : null;
    var forecast = sourceReport is null
        ? await fishing.GetLocationDayAsync(location, targetDate, cancellationToken)
        : null;
    if (sourceReport is null && forecast is null)
        return Results.BadRequest(new { detail = "A data deve estar entre hoje e os próximos 7 dias." });

    var snapshot = await db.FishingForecastSnapshots
        .AsNoTracking()
        .SingleOrDefaultAsync(item => item.LocationId == spot.Slug && item.Date == targetDate, cancellationToken);
    var report = sourceReport ?? FishingForecastAudit.Run(location, forecast!);
    return Results.Ok(new
    {
        audit = report,
        sourceRefresh = refreshSources,
        snapshot = snapshot is null
            ? null
            : new { snapshot.CreatedAt, snapshot.ExpiresAt, PayloadSize = snapshot.PayloadJson.Length }
    });
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots/{id}/approve", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, NotificationRealtimeHub hub, WebPushQueue push, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "shared", cancellationToken);
    if (spot is null) return Results.NotFound();
    spot.IsApproved = true;
    Guid? ownerId = spot.OwnerUserId;
    const string title = "Local publicado";
    var body = $"“{spot.Name}” agora aparece para a comunidade.";
    var notifiedOwnerId = ownerId is Guid recipientId && await UserPrefersRegionAsync(db, recipientId, spot.Region, cancellationToken) ? recipientId : (Guid?)null;
    if (notifiedOwnerId is Guid notifiedId)
        AddNotification(db, notifiedId, title, body, spot.Region);
    await db.SaveChangesAsync(cancellationToken);
    QueueForecastRefresh(forecastQueue, spot);
    if (notifiedOwnerId is Guid dispatchedId)
        DispatchCreated(hub, push, dispatchedId, title, body);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots/{id}/reject", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "shared" && !item.IsApproved, cancellationToken);
    if (spot is null) return Results.NotFound();
    spot.Visibility = "private";
    spot.IsApproved = true;
    Guid? ownerId = spot.OwnerUserId;
    const string title = "Local não publicado";
    var body = $"“{spot.Name}” permanece só no seu mapa.";
    var notifiedOwnerId = ownerId is Guid recipientId && await UserPrefersRegionAsync(db, recipientId, spot.Region, cancellationToken) ? recipientId : (Guid?)null;
    if (notifiedOwnerId is Guid notifiedId)
        AddNotification(db, notifiedId, title, body, spot.Region);
    await db.SaveChangesAsync(cancellationToken);
    if (notifiedOwnerId is Guid dispatchedId)
        DispatchCreated(hub, push, dispatchedId, title, body);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/admin/fishing-spots", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spots = await db.FishingSpots.AsNoTracking()
        .Where(spot => spot.Visibility == "official")
        .OrderBy(spot => spot.Name)
        .ToListAsync(cancellationToken);
    var webcamSpotIds = await ActiveWebcamSpotIdsAsync(db, cancellationToken);
    return Results.Ok(spots.Select(spot => AdminOfficialSpotDto(spot, actor!, webcamSpotIds.Contains(spot.Id))).ToList());
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots", async (OfficialSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var invalid = ValidateOfficialSpot(request);
    if (invalid is not null) return invalid;
    var existingSpots = await db.FishingSpots.AsNoTracking().ToListAsync(cancellationToken);
    if (IsDuplicateSpot(existingSpots, request.Name.Trim(), request.Latitude, request.Longitude))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    var usedSlugs = existingSpots.Select(item => item.Slug).ToList();
    var spot = new FishingSpot
    {
        Slug = UniqueOfficialSlug(request.Name, usedSlugs),
        Visibility = "official",
        IsApproved = true
    };
    ApplyOfficialSpot(spot, request);
    db.FishingSpots.Add(spot);
    await db.SaveChangesAsync(cancellationToken);
    if (spot.IsActive)
        QueueForecastRefresh(forecastQueue, spot);
    return Results.Created($"/api/v1/admin/fishing-spots/{spot.Slug}", AdminOfficialSpotDto(spot, actor!, false));
}).RequireAuthorization();

api.MapPut("/admin/fishing-spots/{id}", async (string id, OfficialSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, FishingForecastCache cache, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var invalid = ValidateOfficialSpot(request);
    if (invalid is not null) return invalid;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "official", cancellationToken);
    if (spot is null) return Results.NotFound();
    var others = await db.FishingSpots.AsNoTracking().Where(item => item.Id != spot.Id).ToListAsync(cancellationToken);
    if (IsDuplicateSpot(others, request.Name.Trim(), request.Latitude, request.Longitude))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    var forecastInputsChanged = SpotRules.ForecastInputsChanged(
        spot,
        request.Latitude,
        request.Longitude,
        request.SeaOrientationDegrees,
        request.Profile);
    var becameActive = !spot.IsActive && request.IsActive;
    ApplyOfficialSpot(spot, request);
    await db.SaveChangesAsync(cancellationToken);
    if (!spot.IsActive)
        await cache.InvalidateLocationAsync(spot.Slug, cancellationToken);
    else if (forecastInputsChanged || becameActive)
    {
        await cache.InvalidateLocationAsync(spot.Slug, cancellationToken);
        QueueForecastRefresh(forecastQueue, spot);
    }
    var hasLiveWebcam = await db.FishingSpotWebcams.AnyAsync(item => item.FishingSpotId == spot.Id && item.IsActive, cancellationToken);
    return Results.Ok(AdminOfficialSpotDto(spot, actor!, hasLiveWebcam));
}).RequireAuthorization();

api.MapDelete("/admin/fishing-spots/{id}", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastCache cache, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "official", cancellationToken);
    if (spot is null) return Results.NotFound();
    var slug = spot.Slug;
    await RemoveSpotDependentsAsync(db, spot.Id, cancellationToken);
    db.FishingSpots.Remove(spot);
    await db.SaveChangesAsync(cancellationToken);
    await cache.InvalidateLocationAsync(slug, cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/admin/users", async (ClaimsPrincipal principal, TaNoMarDbContext db, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var users = await db.Users.AsNoTracking().OrderBy(item => item.Name).ToListAsync(cancellationToken);
    var plans = await db.Plans.AsNoTracking().ToDictionaryAsync(item => item.Code, cancellationToken);
    var activeAdmins = users.Count(item => item.IsActive && string.Equals(item.Role, "Admin", StringComparison.Ordinal));
    var adminCount = users.Count(item => string.Equals(item.Role, "Admin", StringComparison.Ordinal));
    return Results.Ok(users.Select(item => AdminUserDto(item, ResolvePlan(plans, item.PlanCode), actor!, options.Value, activeAdmins, adminCount)).ToList());
}).RequireAuthorization();

api.MapPut("/admin/users/{id:guid}/plan", async (Guid id, AdminPlanRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, IAdminNotificationService adminNotifications, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var planCode = PlanRules.NormalizeAssignable(request.PlanCode);
    if (planCode is null) return Results.BadRequest(new { code = "invalid_plan", detail = "Use o plano free, arrais, premium ou capitao." });
    var target = await db.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (target is null) return Results.NotFound();
    var plan = await db.Plans.SingleAsync(item => item.Code == planCode, cancellationToken);
    if (!plan.IsEnabled)
        return Results.Conflict(new { code = "plan_disabled", detail = "Esse plano está desligado." });
    if (!string.Equals(target.PlanCode, plan.Code, StringComparison.Ordinal))
    {
        var previousPlanName = await db.Plans.AsNoTracking()
            .Where(item => item.Code == target.PlanCode)
            .Select(item => item.Name)
            .SingleOrDefaultAsync(cancellationToken) ?? target.PlanCode;
        target.PlanCode = plan.Code;
        const string title = "Plano atualizado";
        var body = $"Seu plano agora é {plan.Name}.";
        AddNotification(db, target.Id, title, body);
        await db.SaveChangesAsync(cancellationToken);
        adminNotifications.NotifyUserPlanChanged(
            target.Name,
            target.Email,
            previousPlanName,
            plan.Name,
            DateTimeOffset.UtcNow);
        DispatchCreated(hub, push, target.Id, title, body);
    }
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    var adminCount = await db.Users.CountAsync(item => item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor!, options.Value, activeAdmins, adminCount));
}).RequireAuthorization();

api.MapGet("/admin/plans", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var plans = await db.Plans.AsNoTracking()
        .OrderBy(plan => plan.SortOrder)
        .ThenBy(plan => plan.Name)
        .ToListAsync(cancellationToken);
    var activeCounts = await db.Users.AsNoTracking()
        .Where(item => item.IsActive)
        .GroupBy(item => item.PlanCode)
        .Select(group => new { Code = group.Key, Count = group.Count() })
        .ToDictionaryAsync(item => item.Code, item => item.Count, cancellationToken);
    return Results.Ok(plans.Select(plan => PlanRules.CatalogDto(plan, activeCounts.GetValueOrDefault(plan.Code))).ToList());
}).RequireAuthorization();

api.MapPut("/admin/plans/{code}", async (string code, AdminPlanConfigRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var planCode = PlanRules.NormalizeAssignable(code);
    if (planCode is null) return Results.NotFound();
    var plan = await db.Plans.SingleOrDefaultAsync(item => item.Code == planCode, cancellationToken);
    if (plan is null) return Results.NotFound();
    var tagline = request.Tagline?.Trim() ?? string.Empty;
    var bestHoursMode = request.BestHoursMode?.Trim().ToLowerInvariant() ?? plan.BestHoursMode;
    var error = PlanRules.ValidateUpdate(
        request.Name,
        tagline,
        request.MonthlyPriceCents,
        request.SortOrder,
        request.MaxForecastDays,
        bestHoursMode,
        request.MaxFavorites,
        request.MaxPersonalSpots,
        request.MaxAlerts);
    if (error is not null) return Results.BadRequest(new { code = "invalid_plan", detail = error });
    var activeUserCount = await db.Users.CountAsync(item => item.IsActive && item.PlanCode == plan.Code, cancellationToken);
    var availabilityError = PlanRules.ValidateAvailability(plan.Code, request.Enabled, activeUserCount);
    if (availabilityError is not null) return Results.Conflict(new { code = "plan_in_use", detail = availabilityError });
    PlanRules.ApplyUpdate(
        plan,
        request.Name,
        tagline,
        request.MonthlyPriceCents,
        request.SortOrder,
        request.Featured,
        request.Enabled,
        request.MaxForecastDays,
        bestHoursMode,
        request.MaxFavorites,
        request.MaxPersonalSpots,
        request.MaxAlerts,
        request.CanMarine,
        request.CanDiary,
        request.CanOffline,
        request.CanCustomMetrics,
        request.CanCustomWind ?? plan.CanCustomWind,
        request.CanCommunityVote,
        request.CanRankingEmphasis,
        request.CanLiveWebcams);
    if (plan.Featured)
    {
        var others = await db.Plans.Where(item => item.Id != plan.Id && item.Featured).ToListAsync(cancellationToken);
        foreach (var other in others)
            other.Featured = false;
    }
    await db.SaveChangesAsync(cancellationToken);
    await billing.SyncCatalogPricesAsync(plan.Code, cancellationToken);
    return Results.Ok(PlanRules.CatalogDto(plan, activeUserCount));
}).RequireAuthorization();

api.MapPut("/admin/users/{id:guid}/active", async (Guid id, AdminActiveRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var target = await db.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (target is null) return Results.NotFound();
    if (target.Id == actor!.Id) return Results.Conflict(new { code = "self_locked", detail = "Você não pode bloquear a própria conta." });
    if (MatchesBootstrapAdmin(target.Email, target.GoogleSubject, options.Value))
        return Results.Conflict(new { code = "bootstrap_locked", detail = "A conta inicial do bootstrap não pode ser bloqueada." });
    if (!request.IsActive && SpotRules.IsAdmin(target) && await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin" && item.Id != target.Id, cancellationToken) == 0)
        return Results.Conflict(new { code = "last_admin", detail = "Mantenha pelo menos um admin ativo." });
    if (target.IsActive != request.IsActive)
    {
        target.IsActive = request.IsActive;
        string? title = null;
        string? body = null;
        if (!request.IsActive)
        {
            var tokens = await db.RefreshTokens.Where(item => item.UserId == target.Id && item.RevokedAt == null).ToListAsync(cancellationToken);
            var now = DateTimeOffset.UtcNow;
            foreach (var token in tokens) token.RevokedAt = now;
        }
        else
        {
            title = "Conta liberada";
            body = "Sua conta voltou a ficar ativa no TáNoMar.";
            AddNotification(db, target.Id, title, body);
        }
        await db.SaveChangesAsync(cancellationToken);
        if (title is not null && body is not null)
            DispatchCreated(hub, push, target.Id, title, body);
    }
    var plan = await db.Plans.SingleAsync(item => item.Code == target.PlanCode, cancellationToken);
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    var adminCount = await db.Users.CountAsync(item => item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor, options.Value, activeAdmins, adminCount));
}).RequireAuthorization();

api.MapPut("/admin/users/{id:guid}/role", async (Guid id, AdminRoleRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    if (!MatchesBootstrapAdmin(actor!.Email, actor.GoogleSubject, options.Value))
        return Results.Conflict(new { code = "bootstrap_required", detail = "Só a conta inicial pode alterar o cargo de admin." });
    var role = NormalizeAssignableRole(request.Role);
    if (role is null) return Results.BadRequest(new { code = "invalid_role", detail = "Use o cargo Admin ou User." });
    var target = await db.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (target is null) return Results.NotFound();
    if (target.Id == actor.Id)
        return Results.Conflict(new { code = "self_locked", detail = "Você não pode alterar o próprio cargo." });
    if (MatchesBootstrapAdmin(target.Email, target.GoogleSubject, options.Value))
        return Results.Conflict(new { code = "bootstrap_locked", detail = "A conta inicial não pode ter o cargo alterado." });
    if (!string.Equals(target.Role, role, StringComparison.Ordinal))
    {
        target.Role = role;
        var title = "Cargo atualizado";
        var body = string.Equals(role, "Admin", StringComparison.Ordinal)
            ? "Você agora é admin do TáNoMar."
            : "Você não é mais admin do TáNoMar.";
        AddNotification(db, target.Id, title, body);
        await db.SaveChangesAsync(cancellationToken);
        DispatchCreated(hub, push, target.Id, title, body);
    }
    var plan = await db.Plans.SingleAsync(item => item.Code == target.PlanCode, cancellationToken);
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    var adminCount = await db.Users.CountAsync(item => item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor, options.Value, activeAdmins, adminCount));
}).RequireAuthorization();

api.MapDelete("/admin/users/{id:guid}", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, BillingService billing, FishingForecastCache cache, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var target = await db.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (target is null) return Results.NotFound();
    if (target.Id == actor!.Id) return Results.Conflict(new { code = "self_locked", detail = "Você não pode excluir a própria conta." });
    if (MatchesBootstrapAdmin(target.Email, target.GoogleSubject, options.Value))
        return Results.Conflict(new { code = "bootstrap_locked", detail = "A conta inicial do bootstrap não pode ser excluída." });
    if (SpotRules.IsAdmin(target) && await db.Users.CountAsync(item => item.Role == "Admin" && item.Id != target.Id, cancellationToken) == 0)
        return Results.Conflict(new { code = "last_admin", detail = "Mantenha pelo menos um admin ativo." });
    await billing.StopRecurringForDeletedUserAsync(target.Id, cancellationToken);
    await RemoveUserAccountAsync(db, cache, target, cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/partners", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!await ShowPartnersEnabledAsync(db, cancellationToken))
        return Results.NotFound(new { code = "feature_disabled", detail = "Parceiros não estão disponíveis." });
    var now = DateTimeOffset.UtcNow;
    var partners = await db.Partners.AsNoTracking()
        .Where(item => item.IsPublished)
        .OrderByDescending(item => item.IsFeatured)
        .ThenBy(item => item.SortOrder)
        .ThenBy(item => item.Name)
        .ToListAsync(cancellationToken);
    var offers = await PartnerOffersByIdsAsync(db, partners.Select(item => item.Id), cancellationToken);
    return Results.Ok(partners.Select(item => PartnerDto(item, PartnerRules.VisibleOffers(offers.Where(offer => offer.PartnerId == item.Id), now))).ToList());
}).RequireAuthorization();

api.MapGet("/partners/{slug}", async (string slug, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!await ShowPartnersEnabledAsync(db, cancellationToken))
        return Results.NotFound(new { code = "feature_disabled", detail = "Parceiros não estão disponíveis." });
    var partner = await db.Partners.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == slug && item.IsPublished, cancellationToken);
    if (partner is null) return Results.NotFound();
    var offers = await db.PartnerOffers.AsNoTracking().Where(item => item.PartnerId == partner.Id).ToListAsync(cancellationToken);
    return Results.Ok(PartnerDto(partner, PartnerRules.VisibleOffers(offers, DateTimeOffset.UtcNow)));
}).RequireAuthorization();

api.MapGet("/admin/partners", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var partners = await db.Partners.AsNoTracking()
        .OrderByDescending(item => item.IsFeatured)
        .ThenBy(item => item.SortOrder)
        .ThenBy(item => item.Name)
        .ToListAsync(cancellationToken);
    var offers = await PartnerOffersByIdsAsync(db, partners.Select(item => item.Id), cancellationToken);
    return Results.Ok(partners.Select(item => AdminPartnerDto(item, offers.Where(offer => offer.PartnerId == item.Id).OrderBy(offer => offer.SortOrder).ThenBy(offer => offer.Title))).ToList());
}).RequireAuthorization();

api.MapPost("/admin/partners", async (PartnerRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var invalid = ValidatePartner(request);
    if (invalid is not null) return invalid;
    var usedSlugs = await db.Partners.AsNoTracking().Select(item => item.Slug).ToListAsync(cancellationToken);
    var partner = new Partner();
    ApplyPartner(partner, request, UniquePartnerSlug(request, usedSlugs));
    db.Partners.Add(partner);
    ReplacePartnerOffers(db, partner.Id, request.Offers);
    await db.SaveChangesAsync(cancellationToken);
    var offers = await db.PartnerOffers.AsNoTracking().Where(item => item.PartnerId == partner.Id).ToListAsync(cancellationToken);
    return Results.Created($"/api/v1/admin/partners/{partner.Slug}", AdminPartnerDto(partner, offers.OrderBy(item => item.SortOrder).ThenBy(item => item.Title)));
}).RequireAuthorization();

api.MapPut("/admin/partners/{slug}", async (string slug, PartnerRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var invalid = ValidatePartner(request);
    if (invalid is not null) return invalid;
    var partner = await db.Partners.SingleOrDefaultAsync(item => item.Slug == slug, cancellationToken);
    if (partner is null) return Results.NotFound();
    var usedSlugs = await db.Partners.AsNoTracking().Where(item => item.Id != partner.Id).Select(item => item.Slug).ToListAsync(cancellationToken);
    ApplyPartner(partner, request, UniquePartnerSlug(request, usedSlugs, partner.Slug));
    db.PartnerOffers.RemoveRange(db.PartnerOffers.Where(item => item.PartnerId == partner.Id));
    ReplacePartnerOffers(db, partner.Id, request.Offers);
    await db.SaveChangesAsync(cancellationToken);
    var offers = await db.PartnerOffers.AsNoTracking().Where(item => item.PartnerId == partner.Id).ToListAsync(cancellationToken);
    return Results.Ok(AdminPartnerDto(partner, offers.OrderBy(item => item.SortOrder).ThenBy(item => item.Title)));
}).RequireAuthorization();

api.MapDelete("/admin/partners/{slug}", async (string slug, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var partner = await db.Partners.SingleOrDefaultAsync(item => item.Slug == slug, cancellationToken);
    if (partner is null) return Results.NotFound();
    db.PartnerOffers.RemoveRange(db.PartnerOffers.Where(item => item.PartnerId == partner.Id));
    db.Partners.Remove(partner);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/admin/settings", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    return Results.Ok(await PlatformSettingsDtoAsync(db, cancellationToken));
}).RequireAuthorization();

api.MapPut("/admin/settings", async (PlatformSettingsRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var settings = await db.PlatformSettings.SingleAsync(cancellationToken);
    if (request.ShowPartners is not null) settings.ShowPartners = request.ShowPartners.Value;
    if (request.ShowAppFocus is not null) settings.ShowAppFocus = request.ShowAppFocus.Value;
    if (request.ShowLiveWebcams is not null) settings.ShowLiveWebcams = request.ShowLiveWebcams.Value;
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(await PlatformSettingsDtoAsync(db, cancellationToken));
}).RequireAuthorization();

api.MapPut("/me/preferences", async (PreferencesRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (request.Region is not null && string.IsNullOrWhiteSpace(request.Region)) return Results.BadRequest(new { detail = "Região é obrigatória." });
    var preferences = await db.UserPreferences.SingleOrDefaultAsync(item => item.UserId == user.Id, cancellationToken) ?? new UserPreference { UserId = user.Id };
    preferences.Region = request.Region?.Trim() ?? preferences.Region;
    preferences.WindUnit = request.WindUnit ?? preferences.WindUnit;
    preferences.ForecastNotifications = request.ForecastNotifications ?? preferences.ForecastNotifications;
    if (request.Focus is not null)
    {
        if (!IsAppFocus(request.Focus))
            return Results.BadRequest(new { code = "invalid_focus", detail = "Informe pescador, surfista ou ambos." });
        preferences.Focus = request.Focus;
    }
    if (request.VisibleMetrics is not null)
    {
        var plan = await db.Plans.AsNoTracking().SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
        if (!plan.CanCustomMetrics)
            return Results.BadRequest(new { code = "plan_required", detail = "Personalizar os indicadores exige uma assinatura.", requiredPlan = PlanRules.RequiredPlanLabel });
        if (request.VisibleMetrics.Any(metric => !IsVisibleMetric(metric)))
            return Results.BadRequest(new { code = "invalid_metrics", detail = "Um ou mais indicadores são inválidos." });
        preferences.VisibleMetrics = string.Join(
            ',',
            ParseVisibleMetrics(null).Where(request.VisibleMetrics.Contains));
    }
    if (preferences.Id == Guid.Empty) db.UserPreferences.Add(preferences);
    else if (db.Entry(preferences).State == EntityState.Detached) db.UserPreferences.Add(preferences);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(new
    {
        region = preferences.Region,
        windUnit = preferences.WindUnit,
        forecastNotifications = preferences.ForecastNotifications,
        focus = preferences.Focus,
        visibleMetrics = ParseVisibleMetrics(preferences.VisibleMetrics)
    });
}).RequireAuthorization();

api.MapGet("/me/alerts", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var alerts = await db.ForecastAlerts.AsNoTracking()
        .Join(db.FishingSpots, alert => alert.FishingSpotId, spot => spot.Id, (alert, spot) => new { alert, spot })
        .Where(item => item.alert.UserId == user.Id)
        .OrderBy(item => item.spot.Name)
        .Select(item => new { item.alert, item.spot })
        .ToListAsync(cancellationToken);
    return Results.Ok(alerts.Select(item => ForecastAlertDto(item.alert, item.spot)));
}).RequireAuthorization();

api.MapPost("/me/alerts", async (ForecastAlertRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.AsNoTracking().SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    if (plan.MaxAlerts <= 0) return Results.BadRequest(new { code = "plan_required", detail = "Alertas de previsão exigem uma assinatura.", requiredPlan = PlanRules.RequiredPlanLabel });
    if (request.MinimumScore is < 0 or > 10 || request.LeadHours is < 1 or > 168)
        return Results.BadRequest(new { code = "invalid_alert", detail = "Informe uma nota entre 0 e 10 e antecedência entre 1 e 168 horas." });
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (spot is null || (!SpotRules.Owns(spot, user) && (!SpotRules.CanSee(spot, user) || !SpotRules.IsInPreferredRegion(spot.Region, preferredRegions)))) return Results.NotFound();
    var activeCount = await db.ForecastAlerts.CountAsync(item => item.UserId == user.Id && item.IsActive, cancellationToken);
    if (activeCount >= plan.MaxAlerts) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais alertas." });
    if (await db.ForecastAlerts.AnyAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken))
        return Results.Conflict(new { code = "alert_exists", detail = "Você já acompanha este local." });
    var alert = new ForecastAlert { UserId = user.Id, FishingSpotId = spot.Id, MinimumScore = request.MinimumScore, LeadHours = request.LeadHours };
    db.ForecastAlerts.Add(alert);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/v1/me/alerts/{alert.Id}", ForecastAlertDto(alert, spot));
}).RequireAuthorization();

api.MapPut("/me/alerts/{id:guid}", async (Guid id, ForecastAlertRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (request.MinimumScore is < 0 or > 10 || request.LeadHours is < 1 or > 168)
        return Results.BadRequest(new { code = "invalid_alert", detail = "Informe uma nota entre 0 e 10 e antecedência entre 1 e 168 horas." });
    var alert = await db.ForecastAlerts.SingleOrDefaultAsync(item => item.Id == id && item.UserId == user.Id, cancellationToken);
    if (alert is null) return Results.NotFound();
    alert.MinimumScore = request.MinimumScore;
    alert.LeadHours = request.LeadHours;
    alert.IsActive = request.IsActive;
    alert.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(cancellationToken);
    var spot = await db.FishingSpots.FindAsync([alert.FishingSpotId], cancellationToken);
    return spot is null ? Results.NotFound() : Results.Ok(ForecastAlertDto(alert, spot));
}).RequireAuthorization();

api.MapDelete("/me/alerts/{id:guid}", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var alert = await db.ForecastAlerts.SingleOrDefaultAsync(item => item.Id == id && item.UserId == user.Id, cancellationToken);
    if (alert is null) return Results.NotFound();
    db.ForecastAlerts.Remove(alert);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPut("/me/favorites", async (FavoriteRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (!SpotRules.CanSee(spot, user) || !SpotRules.IsInPreferredRegion(spot, preferredRegions) || (spot.Visibility == "shared" && !spot.IsApproved && !SpotRules.Owns(spot, user))) return Results.Forbid();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var favorite = await db.FavoriteSpots.SingleOrDefaultAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    if (request.IsFavorite && favorite is null && await db.FavoriteSpots.CountAsync(item => item.UserId == user.Id, cancellationToken) >= plan.MaxFavorites) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais favoritos." });
    if (request.IsFavorite && favorite is null) { favorite = new FavoriteSpot { UserId = user.Id, FishingSpotId = spot.Id }; db.FavoriteSpots.Add(favorite); }
    if (!request.IsFavorite && favorite is not null) db.FavoriteSpots.Remove(favorite);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPut("/me/enabled-spots", async (EnabledSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastRefreshQueue forecastQueue, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (!SpotRules.CanSee(spot, user) || !SpotRules.IsInPreferredRegion(spot, preferredRegions) || (spot.Visibility == "shared" && !spot.IsApproved && !SpotRules.Owns(spot, user))) return Results.Forbid();
    var setting = await db.EnabledSpots.SingleOrDefaultAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    if (setting is null)
    {
        db.EnabledSpots.Add(new EnabledSpot { UserId = user.Id, FishingSpotId = spot.Id, IsEnabled = request.IsEnabled });
    }
    else
    {
        setting.IsEnabled = request.IsEnabled;
    }
    await db.SaveChangesAsync(cancellationToken);
    if (request.IsEnabled)
        QueueForecastRefresh(forecastQueue, spot);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPut("/me/spot-wind", async (IdealWindRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.AsNoTracking().SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    if (!plan.CanCustomWind)
        return Results.BadRequest(new { code = "plan_required", detail = "Escolher o vento ideal exige uma assinatura compatível.", requiredPlan = PlanRules.RequiredPlanLabel });
    if (!SpotRules.IsValidIdealWindDirection(request.IdealWindDirectionDegrees))
        return Results.BadRequest(new { detail = "Escolha uma direção de vento válida." });
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (!SpotRules.CanSee(spot, user) || (!SpotRules.Owns(spot, user) && !SpotRules.IsInPreferredRegion(spot, preferredRegions))) return Results.Forbid();
    var setting = await db.EnabledSpots.SingleOrDefaultAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    if (setting is null)
    {
        db.EnabledSpots.Add(new EnabledSpot
        {
            UserId = user.Id,
            FishingSpotId = spot.Id,
            IsEnabled = SpotRules.EnabledByDefault(spot),
            IdealWindDirectionDegrees = request.IdealWindDirectionDegrees
        });
    }
    else
    {
        setting.IdealWindDirectionDegrees = request.IdealWindDirectionDegrees;
    }
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/forecasts/ranking", async (string? emphasis, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, FishingForecastRefreshQueue forecastQueue, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!FishingRankingEmphasis.TryParse(emphasis, out var parsedEmphasis))
        return Results.BadRequest(new { detail = "Ênfase inválida. Use wind, wind-more, rain, rain-more, waves ou waves-less." });
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    if (FishingRankingEmphasis.RequiresPremium(parsedEmphasis) && !plan.CanRankingEmphasis)
        return Results.BadRequest(new { code = "plan_required", detail = "Reordenar o ranking exige uma assinatura.", requiredPlan = PlanRules.RequiredPlanLabel });
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    var idealWindSettings = plan.CanCustomWind
        ? await IdealWindSettingsAsync(db, user.Id, cancellationToken)
        : [];
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    var visibleSpots = await db.FishingSpots.AsNoTracking()
        .Where(spot => (spot.Visibility == "official" && spot.IsActive) || (spot.Visibility == "shared" && spot.IsApproved) || spot.OwnerUserId == user.Id)
        .ToListAsync(cancellationToken);
    visibleSpots = visibleSpots.Where(spot => SpotRules.CanSee(spot, user) && SpotRules.IsInPreferredRegion(spot, preferredRegions)).ToList();
    var enabledSlugs = visibleSpots.Where(spot => SpotRules.IsEnabledForUser(spot, enabledSettings)).Select(spot => spot.Slug).ToHashSet();
    var ownerSlugs = await OwnerSpotSlugsAsync(db, user.Id, cancellationToken);
    var visibilities = SpotVisibilities(visibleSpots);
    var days = new List<object>();
    var forecasts = new List<FishingForecast>();
    for (var day = 0; day < plan.MaxForecastDays; day++)
    {
        var forecast = ApplyIdealWindSettings(await fishing.GetAsync(day, cancellationToken, user.Id, enabledSlugs), visibleSpots, idealWindSettings);
        forecasts.Add(forecast);
        var ordered = forecast with { Ranking = FishingRankingEmphasis.Order(forecast.Ranking, parsedEmphasis) };
        days.Add(ForecastDayDto(ordered, plan.CanMarine, plan.BestHoursMode, ownerSlugs, visibilities));
    }
    return Results.Ok(new { generatedAt = DateTimeOffset.UtcNow, availableFrom = DateOnly.FromDateTime(DateTime.UtcNow), availableTo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(plan.MaxForecastDays - 1)), refresh = ForecastRefreshDto(forecasts, forecastQueue.Snapshot(enabledSlugs)), days });
}).RequireAuthorization();

api.MapGet("/admin/workers", async (ClaimsPrincipal principal, TaNoMarDbContext db, WorkerSettingsService workerSettings, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var items = new List<object>();
    foreach (var definition in WorkerCatalog.All)
    {
        var settings = await workerSettings.GetAsync(definition.Key, cancellationToken);
        items.Add(WorkerDto(definition, settings, workerSettings.TimeZoneId));
    }
    return Results.Ok(items);
}).RequireAuthorization();

api.MapPut("/admin/workers/{key}", async (string key, AdminWorkerRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, WorkerSettingsService workerSettings, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var definition = WorkerCatalog.Find(key);
    if (definition is null) return Results.NotFound();

    string? cronExpression = null;
    if (definition.Kind == WorkerKind.Scheduled
        && !WorkerCatalog.TryNormalizeCron(request.CronExpression, out cronExpression!))
    {
        return Results.BadRequest(new
        {
            code = "invalid_cron",
            detail = "Informe uma expressão CRON válida com cinco campos: minuto, hora, dia, mês e dia da semana."
        });
    }

    var configuration = await db.WorkerConfigurations.SingleOrDefaultAsync(item => item.Key == key, cancellationToken);
    if (configuration is null)
    {
        configuration = new WorkerConfiguration { Key = key };
        db.WorkerConfigurations.Add(configuration);
    }
    configuration.IsEnabled = request.IsEnabled;
    configuration.CronExpression = cronExpression;
    configuration.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(cancellationToken);
    workerSettings.Invalidate(key);
    return Results.Ok(WorkerDto(
        definition,
        new WorkerSettingsSnapshot(key, configuration.IsEnabled, configuration.CronExpression),
        workerSettings.TimeZoneId));
}).RequireAuthorization();

api.MapGet("/fishing-spots/{id}/forecast", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, FishingForecastRefreshQueue forecastQueue, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == id && ((item.Visibility == "official" && item.IsActive) || (item.Visibility == "shared" && item.IsApproved) || item.OwnerUserId == user.Id), cancellationToken);
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (spot is null || !SpotRules.CanSee(spot, user) || (!SpotRules.Owns(spot, user) && !SpotRules.IsInPreferredRegion(spot, preferredRegions))) return Results.NotFound();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var idealWindDirection = plan.CanCustomWind
        ? await db.EnabledSpots.AsNoTracking().Where(item => item.UserId == user.Id && item.FishingSpotId == spot.Id).Select(item => item.IdealWindDirectionDegrees).SingleOrDefaultAsync(cancellationToken)
        : null;
    var result = new List<object>();
    var forecasts = new List<FishingForecast>();
    var onlySpot = new HashSet<string>(StringComparer.Ordinal) { spot.Slug };
    for (var day = 0; day < plan.MaxForecastDays; day++)
    {
        var forecast = await fishing.GetAsync(day, cancellationToken, user.Id, onlySpot);
        forecasts.Add(forecast);
        var filtered = forecast with { Ranking = forecast.Ranking.Where(item => item.Id == spot.Slug).Select(item => FishingWindPreference.Apply(item, idealWindDirection, spot.SeaOrientationDegrees, spot.Profile)).ToList() };
        result.Add(ForecastDayDto(filtered, plan.CanMarine, plan.BestHoursMode, OwnerSpotIds([spot], user), SpotVisibilities([spot]), includeSelectableHours: true));
    }
    return Results.Ok(new { spotId = spot.Slug, refresh = ForecastRefreshDto(forecasts, forecastQueue.Snapshot(onlySpot)), days = result });
}).RequireAuthorization();

api.MapGet("/fishing-spots/{id}/marine", async (string id, DateOnly? date, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == id && ((item.Visibility == "official" && item.IsActive) || (item.Visibility == "shared" && item.IsApproved) || item.OwnerUserId == user.Id), cancellationToken);
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (spot is null || !SpotRules.CanSee(spot, user) || !SpotRules.IsInPreferredRegion(spot, preferredRegions)) return Results.NotFound();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var targetDate = date ?? fishing.Today();
    var dayOffset = targetDate.DayNumber - fishing.Today().DayNumber;
    if (dayOffset < 0 || dayOffset >= plan.MaxForecastDays) return Results.BadRequest(new { detail = "Data fora da janela do plano." });
    if (!plan.CanMarine) return Results.Ok(MarineLockedDto(spot.Slug, targetDate));
    if (!SpotRules.HasCoordinates(spot)) return Results.NotFound();
    var location = new FishingLocation
    {
        Id = spot.Slug,
        Name = spot.Name,
        Latitude = spot.Latitude ?? 0,
        Longitude = spot.Longitude ?? 0,
        SeaOrientationDegrees = spot.SeaOrientationDegrees,
        Profile = spot.Profile
    };
    var forecast = await fishing.GetLocationDayAsync(location, targetDate, cancellationToken);
    if (forecast is null) return Results.NotFound();
    return Results.Ok(MarineDto(spot.Slug, targetDate, forecast, TideFromForecast(forecast, targetDate, fishing.Today())));
}).RequireAuthorization();

api.MapGet("/community/reports", async (string? spotId, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    var now = DateTimeOffset.UtcNow;
    var query = db.CommunityReports.AsNoTracking().Where(report => report.ExpiresAt > now)
        .Join(db.FishingSpots, report => report.FishingSpotId, spot => spot.Id, (report, spot) => new { report, spot })
        .Where(item => (item.spot.Visibility == "official" && item.spot.IsActive) || (item.spot.Visibility == "shared" && item.spot.IsApproved));
    if (!string.IsNullOrWhiteSpace(spotId))
        query = query.Where(item => item.spot.Slug == spotId);
    var rows = (await query.OrderByDescending(item => item.report.CreatedAt).ToListAsync(cancellationToken))
        .Where(item => SpotRules.CanSee(item.spot, user) && SpotRules.IsInPreferredRegion(item.spot, preferredRegions))
        .ToList();
    var reportIds = rows.Select(item => item.report.Id).ToList();
    var authorIds = rows.Select(item => item.report.UserId).Distinct().ToList();
    var myVotes = await db.CommunityReportVotes.AsNoTracking().Where(vote => vote.UserId == user.Id && reportIds.Contains(vote.ReportId)).ToListAsync(cancellationToken);
    var authors = await db.Users.AsNoTracking().Where(item => authorIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
    return Results.Ok(rows.Select(item => ReportDto(item.report, item.spot, myVotes.FirstOrDefault(vote => vote.ReportId == item.report.Id)?.Kind, item.report.UserId == user.Id, AuthorName(authors.GetValueOrDefault(item.report.UserId)))).ToList());
}).RequireAuthorization();
api.MapPost("/community/reports", async (CommunityReportRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!SpotRules.IsValidReportType(request.Type.Trim())) return Results.BadRequest(new { detail = "Tipo de relato inválido." });
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.IsCommunityVisible(spot) || !SpotRules.IsIncludedInPlan(spot, user.PlanCode)) return Results.Forbid();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (!SpotRules.IsInPreferredRegion(spot, preferredRegions)) return Results.Forbid();
    var type = request.Type.Trim().ToLowerInvariant();
    var comment = SpotRules.NormalizeReportComment(request.Comment);
    var (dayStart, dayEnd) = SpotRules.SaoPauloDayUtcRange(DateTimeOffset.UtcNow);
    var alreadyReported = await db.CommunityReports.AnyAsync(item =>
        item.UserId == user.Id
        && item.FishingSpotId == spot.Id
        && item.Type == type
        && item.Comment == comment
        && item.CreatedAt >= dayStart
        && item.CreatedAt < dayEnd, cancellationToken);
    if (alreadyReported)
        return Results.Conflict(new { code = "duplicate_report", detail = "Você já enviou este relato hoje neste local." });
    var report = new CommunityReport { UserId = user.Id, FishingSpotId = spot.Id, Type = type, Comment = comment, ExpiresAt = DateTimeOffset.UtcNow.AddHours(type == "perigo" ? 24 : 12) };
    db.CommunityReports.Add(report);
    var activeRecipientIds = await db.Users.Where(item => item.IsActive && item.Id != user.Id).Select(item => item.Id).ToListAsync(cancellationToken);
    var recipientPreferences = await db.UserPreferences.AsNoTracking().Where(item => activeRecipientIds.Contains(item.UserId)).ToDictionaryAsync(item => item.UserId, item => item.Region, cancellationToken);
    var recipientIds = activeRecipientIds.Where(id => SpotRules.IsInPreferredRegion(spot.Region, recipientPreferences.GetValueOrDefault(id))).ToList();
    const string title = "Novo relato";
    var body = $"{user.Name} relatou {LabelForReportType(type)} em {spot.Name}.";
    foreach (var recipientId in recipientIds)
        AddNotification(db, recipientId, title, body, spot.Region);
    const string authorTitle = "Relato enviado";
    var authorBody = $"Seu relato de {LabelForReportType(type)} em {spot.Name} foi publicado.";
    AddNotification(db, user.Id, authorTitle, authorBody, spot.Region);
    await db.SaveChangesAsync(cancellationToken);
    foreach (var recipientId in recipientIds)
        DispatchCreated(hub, push, recipientId, title, body);
    DispatchCreated(hub, push, user.Id, authorTitle, authorBody);
    return Results.Created($"/api/v1/community/reports/{report.Id}", ReportDto(report, spot, null, true, AuthorName(user.Name)));
}).RequireAuthorization().RequireRateLimiting("community");
api.MapPost("/community/reports/{id:guid}/confirm", (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) => VoteReportAsync(id, "confirm", principal, db, cancellationToken)).RequireAuthorization().RequireRateLimiting("community");
api.MapPost("/community/reports/{id:guid}/contest", (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) => VoteReportAsync(id, "contest", principal, db, cancellationToken)).RequireAuthorization().RequireRateLimiting("community");
api.MapDelete("/community/reports/{id:guid}", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var report = await db.CommunityReports.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (report is null || report.ExpiresAt <= DateTimeOffset.UtcNow) return Results.NotFound();
    if (report.UserId != user.Id) return Results.Forbid();
    db.CommunityReportVotes.RemoveRange(db.CommunityReportVotes.Where(vote => vote.ReportId == id));
    db.CommunityReports.Remove(report);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization().RequireRateLimiting("community");
api.MapGet("/notifications", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    var notifications = await db.Notifications.AsNoTracking().Where(item => item.UserId == user.Id && item.RemovedAt == null && item.ExpiresAt > DateTimeOffset.UtcNow).OrderByDescending(item => item.CreatedAt).ToListAsync(cancellationToken);
    return Results.Ok(notifications.Where(item => item.Region is null || SpotRules.IsInPreferredRegion(item.Region, preferredRegions)).Select(item => new { id = item.Id, title = item.Title, body = item.Body, createdAt = item.CreatedAt, readAt = item.ReadAt }).ToList());
}).RequireAuthorization();
api.MapGet("/notifications/unread", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    return Results.Ok(new { unread = await HasUnreadAsync(db, user.Id, cancellationToken) });
}).RequireAuthorization();
api.MapGet("/notifications/stream", async (ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, HttpContext context, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    context.Response.Headers.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["X-Accel-Buffering"] = "no";
    context.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();
    var gate = new SemaphoreSlim(1, 1);
    await WriteSseEvent(context, gate, new { unread = await HasUnreadAsync(db, user.Id, cancellationToken) }, cancellationToken);
    using var heartbeat = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    var keepAlive = Task.Run(async () =>
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(20));
        try
        {
            while (await timer.WaitForNextTickAsync(heartbeat.Token))
            {
                await gate.WaitAsync(heartbeat.Token);
                try
                {
                    await context.Response.WriteAsync(": keepalive\n\n", heartbeat.Token);
                    await context.Response.Body.FlushAsync(heartbeat.Token);
                }
                finally
                {
                    gate.Release();
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
    }, heartbeat.Token);
    try
    {
        await foreach (var ping in hub.Subscribe(user.Id, cancellationToken))
            await WriteSseEvent(context, gate, new { unread = ping.Unread }, cancellationToken);
    }
    finally
    {
        heartbeat.Cancel();
        await keepAlive;
    }
    return Results.Empty;
}).RequireAuthorization();
api.MapGet("/notifications/push-public-key", (Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options) =>
{
    if (!options.Value.HasVapid) return Results.NotFound();
    return Results.Ok(new { publicKey = options.Value.VapidPublicKey });
}).RequireAuthorization();
api.MapPut("/notifications/push-subscription", async (PushSubscriptionRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.Endpoint) || string.IsNullOrWhiteSpace(request.P256dh) || string.IsNullOrWhiteSpace(request.Auth))
        return Results.BadRequest(new { detail = "Subscription incompleta." });
    var item = await db.PushSubscriptions.SingleOrDefaultAsync(subscription => subscription.Endpoint == request.Endpoint, cancellationToken);
    if (item is null)
    {
        db.PushSubscriptions.Add(new DevicePushSubscription
        {
            UserId = user.Id,
            Endpoint = request.Endpoint.Trim(),
            P256dh = request.P256dh.Trim(),
            Auth = request.Auth.Trim()
        });
    }
    else
    {
        item.UserId = user.Id;
        item.P256dh = request.P256dh.Trim();
        item.Auth = request.Auth.Trim();
    }
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();
api.MapDelete("/notifications/push-subscription", async ([FromBody] PushSubscriptionRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.Endpoint)) return Results.BadRequest(new { detail = "Endpoint ausente." });
    var item = await db.PushSubscriptions.SingleOrDefaultAsync(subscription => subscription.Endpoint == request.Endpoint && subscription.UserId == user.Id, cancellationToken);
    if (item is not null)
    {
        db.PushSubscriptions.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
    }
    return Results.NoContent();
}).RequireAuthorization();
api.MapPost("/notifications/{id:guid}/read", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var item = await db.Notifications.SingleOrDefaultAsync(notification => notification.Id == id && notification.UserId == user.Id, cancellationToken);
    if (item is null) return Results.NotFound();
    item.ReadAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(cancellationToken);
    hub.Publish(user.Id, await HasUnreadAsync(db, user.Id, cancellationToken));
    return Results.NoContent();
}).RequireAuthorization();
api.MapDelete("/notifications/{id:guid}", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var item = await db.Notifications.SingleOrDefaultAsync(notification => notification.Id == id && notification.UserId == user.Id, cancellationToken);
    if (item is null) return Results.NotFound();
    item.RemovedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync(cancellationToken);
    hub.Publish(user.Id, await HasUnreadAsync(db, user.Id, cancellationToken));
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/public/offline-forecast", async (FishingForecastService fishing, HttpContext context, CancellationToken cancellationToken) =>
{
    context.Response.Headers.CacheControl = "public, max-age=3600";
    return Results.Ok(ForecastDayDto(await fishing.GetAsync(0, cancellationToken), false, PlanRules.DefaultBestHoursMode));
});

app.MapFallbackToFile("index.html");
await app.RunAsync();

static async Task<(User? actor, IResult? failure)> AdminActorAsync(ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return (null, Results.Unauthorized());
    if (!SpotRules.IsAdmin(user)) return (null, Results.Forbid());
    return (user, null);
}
static Plan ResolvePlan(IReadOnlyDictionary<string, Plan> plans, string planCode) =>
    plans.TryGetValue(planCode, out var plan) ? plan : new Plan { Code = planCode, Name = planCode };
static string? AdminProtection(User item, User actor, TaNoMarOptions options, int activeAdmins)
{
    if (MatchesBootstrapAdmin(item.Email, item.GoogleSubject, options)) return "bootstrap";
    if (item.Id == actor.Id) return "self";
    if (item.IsActive && SpotRules.IsAdmin(item) && activeAdmins <= 1) return "last_admin";
    return null;
}
static object AdminUserDto(User item, Plan plan, User actor, TaNoMarOptions options, int activeAdmins, int adminCount)
{
    var protection = AdminProtection(item, actor, options, activeAdmins);
    return new
    {
        id = item.Id,
        name = item.Name,
        email = item.Email,
        pictureUrl = item.PictureUrl,
        role = item.Role,
        isActive = item.IsActive,
        plan = new { code = plan.Code, name = plan.Name },
        createdAt = item.CreatedAt,
        isSelf = item.Id == actor.Id,
        protection,
        canChangePlan = true,
        canDeactivate = protection is null,
        canDelete = CanDeleteAdminUser(item, actor, options, adminCount),
        canChangeRole = CanChangeAdminRole(actor, item, options)
    };
}
static bool CanDeleteAdminUser(User item, User actor, TaNoMarOptions options, int adminCount) =>
    !MatchesBootstrapAdmin(item.Email, item.GoogleSubject, options)
    && item.Id != actor.Id
    && !(SpotRules.IsAdmin(item) && adminCount <= 1);
static bool CanChangeAdminRole(User actor, User target, TaNoMarOptions options) =>
    MatchesBootstrapAdmin(actor.Email, actor.GoogleSubject, options)
    && actor.Id != target.Id
    && !MatchesBootstrapAdmin(target.Email, target.GoogleSubject, options);
static string? NormalizeAssignableRole(string? role)
{
    if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)) return "Admin";
    if (string.Equals(role, "User", StringComparison.OrdinalIgnoreCase)) return "User";
    return null;
}
static bool ApplyBootstrapAdmin(User user, string? email, string? googleSubject, TaNoMarOptions options, bool assignDefaultPlan = false)
{
    if (!MatchesBootstrapAdmin(email, googleSubject, options)) return false;
    var changed = false;
    if (!string.Equals(user.Role, "Admin", StringComparison.Ordinal))
    {
        user.Role = "Admin";
        changed = true;
    }
    if (assignDefaultPlan && !string.Equals(user.PlanCode, PlanRules.Mestre, StringComparison.Ordinal))
    {
        user.PlanCode = PlanRules.Mestre;
        changed = true;
    }
    return changed;
}
static bool MatchesBootstrapAdmin(string? email, string? googleSubject, TaNoMarOptions options) =>
    (!string.IsNullOrWhiteSpace(options.BootstrapAdminGoogleSubject) && googleSubject == options.BootstrapAdminGoogleSubject)
    || (!string.IsNullOrWhiteSpace(options.BootstrapAdminEmail) && string.Equals(email, options.BootstrapAdminEmail, StringComparison.OrdinalIgnoreCase));
static void SetRefreshCookie(HttpContext context, string value, bool development) => context.Response.Cookies.Append(TaNoMarOptions.RefreshCookieName, value, new CookieOptions { HttpOnly = true, Secure = !development, SameSite = SameSiteMode.Lax, MaxAge = TimeSpan.FromDays(30), Path = "/api/v1/auth" });
static async Task<User?> CurrentUserAsync(ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) { var id = principal.FindFirstValue(ClaimTypes.NameIdentifier); return Guid.TryParse(id, out var userId) ? await db.Users.SingleOrDefaultAsync(user => user.Id == userId, cancellationToken) : null; }
static async Task<bool> ShowLiveWebcamsEnabledAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
    return settings is null || settings.ShowLiveWebcams;
}
static async Task<bool> ShowPartnersEnabledAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
    return settings?.ShowPartners == true;
}
static async Task<bool> ShowAppFocusEnabledAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
    return settings?.ShowAppFocus == true;
}
static async Task<object> PlatformSettingsDtoAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
    return new
    {
        showPartners = settings?.ShowPartners == true,
        showAppFocus = settings?.ShowAppFocus == true,
        showLiveWebcams = settings is null || settings.ShowLiveWebcams
    };
}

static async Task<object> UserDtoAsync(User user, TaNoMarDbContext db, BillingService billing, CancellationToken cancellationToken)
{
    await billing.ApplyDueAccessAsync(user, cancellationToken);
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var preferences = await db.UserPreferences.AsNoTracking().SingleOrDefaultAsync(item => item.UserId == user.Id, cancellationToken);
    return new
    {
        id = user.Id,
        name = user.Name,
        email = user.Email,
        pictureUrl = user.PictureUrl,
        role = user.Role,
        plan = new { code = plan.Code, name = plan.Name },
        entitlements = new { maxForecastDays = plan.MaxForecastDays, bestHoursMode = plan.BestHoursMode, maxFavorites = plan.MaxFavorites, maxPersonalSpots = plan.MaxPersonalSpots, maxAlerts = plan.MaxAlerts },
        modules = PlanRules.ModulesDto(plan),
        features = new
        {
            showPartners = await ShowPartnersEnabledAsync(db, cancellationToken),
            showAppFocus = await ShowAppFocusEnabledAsync(db, cancellationToken),
            showLiveWebcams = await ShowLiveWebcamsEnabledAsync(db, cancellationToken)
        },
        preferences = new
        {
            region = preferences?.Region ?? "Florianópolis",
            windUnit = preferences?.WindUnit ?? "kmh",
            forecastNotifications = preferences?.ForecastNotifications ?? true,
            focus = preferences?.Focus,
            visibleMetrics = ParseVisibleMetrics(preferences?.VisibleMetrics)
        },
        billing = await billing.DtoAsync(user, cancellationToken)
    };
}
static string[] ParseVisibleMetrics(string? value) =>
    (value ?? "wind,gusts,waves,wave-period,swell,rain,air-temperature,water-temperature")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
static bool IsVisibleMetric(string metric) => metric is
    "wind" or "gusts" or "waves" or "wave-period" or "swell" or "rain" or
    "air-temperature" or "water-temperature";
static bool IsAppFocus(string focus) => focus is "pescador" or "surfista" or "ambos";
static Task<Dictionary<Guid, bool>> EnabledSettingsAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    db.EnabledSpots.Where(item => item.UserId == userId).ToDictionaryAsync(item => item.FishingSpotId, item => item.IsEnabled, cancellationToken);
static Task<Dictionary<Guid, int?>> IdealWindSettingsAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    db.EnabledSpots.Where(item => item.UserId == userId).ToDictionaryAsync(item => item.FishingSpotId, item => item.IdealWindDirectionDegrees, cancellationToken);
static async Task<string?> PreferredRegionsAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    await db.UserPreferences.AsNoTracking().Where(item => item.UserId == userId).Select(item => item.Region).SingleOrDefaultAsync(cancellationToken);
static async Task<bool> UserPrefersRegionAsync(TaNoMarDbContext db, Guid userId, string region, CancellationToken cancellationToken) =>
    SpotRules.IsInPreferredRegion(region, await PreferredRegionsAsync(db, userId, cancellationToken));

static void QueueForecastRefresh(FishingForecastRefreshQueue queue, FishingSpot spot)
{
    if (SpotRules.HasCoordinates(spot))
        queue.Enqueue(FishingForecastService.ToFishingLocation(spot));
}

static object WorkerDto(WorkerDefinition definition, WorkerSettingsSnapshot settings, string timeZone) => new
{
    definition.Key,
    definition.Name,
    kind = definition.Kind == WorkerKind.Scheduled ? "scheduled" : "queue",
    enabled = settings.IsEnabled,
    cronExpression = settings.CronExpression,
    timeZone,
    description = definition.Description,
    usedBy = definition.UsedBy,
    dataSource = definition.DataSource
};

static object SpotDtoProjection(FishingSpot spot, User user, bool favorite = false, bool? enabled = null, bool hasLiveWebcam = false, int? idealWindDirectionDegrees = null)
{
    var isEnabled = enabled ?? SpotRules.EnabledByDefault(spot);
    return new
    {
        id = spot.Slug,
        name = spot.Name,
        slug = spot.Slug,
        description = spot.Description,
        city = spot.City,
        state = spot.State,
        region = spot.Region,
        type = spot.Type,
        fishingEnvironment = spot.FishingEnvironment,
        accessType = spot.AccessType,
        restrictionNotes = spot.RestrictionNotes,
        visibility = spot.Visibility,
        profile = spot.Profile,
        latitude = spot.Latitude,
        longitude = spot.Longitude,
        seaOrientationDegrees = spot.SeaOrientationDegrees,
        isFavorite = favorite,
        isEnabled,
        isInRanking = isEnabled,
        isApproved = spot.IsApproved,
        isOwner = SpotRules.Owns(spot, user),
        hasLiveWebcam,
        idealWindDirectionDegrees
    };
}

static object AdminOfficialSpotDto(FishingSpot spot, User actor, bool hasLiveWebcam) => new
{
    id = spot.Slug,
    name = spot.Name,
    slug = spot.Slug,
    description = spot.Description,
    city = spot.City,
    state = spot.State,
    region = spot.Region,
    type = spot.Type,
    fishingEnvironment = spot.FishingEnvironment,
    accessType = spot.AccessType,
    restrictionNotes = spot.RestrictionNotes,
    visibility = spot.Visibility,
    profile = spot.Profile,
    latitude = spot.Latitude,
    longitude = spot.Longitude,
    seaOrientationDegrees = spot.SeaOrientationDegrees,
    isFavorite = false,
    isEnabled = SpotRules.EnabledByDefault(spot),
    isInRanking = SpotRules.EnabledByDefault(spot),
    isApproved = spot.IsApproved,
    isOwner = SpotRules.Owns(spot, actor),
    hasLiveWebcam,
    isActive = spot.IsActive,
    isFreeDefault = spot.IsFreeDefault
};

static IResult? ValidateOfficialSpot(OfficialSpotRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Region))
        return Results.BadRequest(new { detail = "Nome e região são obrigatórios." });
    if (!SpotRules.IsValidSpotRegion(request.Region))
        return Results.BadRequest(new { detail = "Informe uma região válida: norte, sul, leste, oeste, continente ou ilhas." });
    if (request.Latitude is null != request.Longitude is null)
        return Results.BadRequest(new { detail = "Latitude e longitude devem ser informadas juntas." });
    if (request.Type is not null && !SpotRules.Types.Contains(request.Type, StringComparer.Ordinal))
        return Results.BadRequest(new { detail = "Tipo de local inválido." });
    if (request.FishingEnvironment is not null && !SpotRules.FishingEnvironments.Contains(request.FishingEnvironment, StringComparer.Ordinal))
        return Results.BadRequest(new { detail = "Ambiente de pesca inválido." });
    if (request.AccessType is not null && !SpotRules.AccessTypes.Contains(request.AccessType, StringComparer.Ordinal))
        return Results.BadRequest(new { detail = "Tipo de acesso inválido." });
    return null;
}

static void ApplyOfficialSpot(FishingSpot spot, OfficialSpotRequest request)
{
    spot.Name = request.Name.Trim();
    spot.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    spot.City = request.City?.Trim() ?? spot.City;
    spot.State = string.IsNullOrWhiteSpace(request.State) ? (string.IsNullOrWhiteSpace(spot.State) ? "SC" : spot.State) : request.State.Trim();
    spot.Region = SpotRules.NormalizeRegion(request.Region);
    spot.Latitude = request.Latitude;
    spot.Longitude = request.Longitude;
    spot.SeaOrientationDegrees = request.SeaOrientationDegrees;
    spot.Profile = SpotRules.NormalizeProfile(request.Profile);
    spot.Type = SpotRules.NormalizeType(request.Type ?? spot.Type);
    spot.FishingEnvironment = SpotRules.NormalizeFishingEnvironment(request.FishingEnvironment ?? spot.FishingEnvironment);
    spot.AccessType = SpotRules.NormalizeAccessType(request.AccessType ?? spot.AccessType);
    spot.RestrictionNotes = SpotRules.NormalizeRestrictionNotes(request.RestrictionNotes);
    spot.IsActive = request.IsActive;
    spot.IsFreeDefault = request.IsFreeDefault;
    spot.Visibility = "official";
    spot.IsApproved = true;
    spot.OwnerUserId = null;
}

static string UniqueOfficialSlug(string name, IReadOnlyCollection<string> used)
{
    var seed = SpotRules.Slugify(name);
    var slug = seed;
    var index = 2;
    while (used.Contains(slug, StringComparer.OrdinalIgnoreCase))
    {
        slug = $"{seed}-{index}";
        index++;
    }
    return slug;
}

static async Task RemoveUserAccountAsync(TaNoMarDbContext db, FishingForecastCache cache, User target, CancellationToken cancellationToken)
{
    var userId = target.Id;
    var ownedSpots = await db.FishingSpots.Where(spot => spot.OwnerUserId == userId).ToListAsync(cancellationToken);
    var personalSpots = ownedSpots.Where(spot => spot.Visibility != "official").ToList();
    foreach (var spot in personalSpots)
        await RemoveSpotDependentsAsync(db, spot.Id, cancellationToken);
    foreach (var official in ownedSpots.Where(spot => spot.Visibility == "official"))
        official.OwnerUserId = null;
    db.FishingSpots.RemoveRange(personalSpots);

    var authoredReportIds = await db.CommunityReports.Where(report => report.UserId == userId).Select(report => report.Id).ToListAsync(cancellationToken);
    var votesOnOthers = await db.CommunityReportVotes
        .Where(vote => vote.UserId == userId && !authoredReportIds.Contains(vote.ReportId))
        .ToListAsync(cancellationToken);
    if (votesOnOthers.Count > 0)
    {
        var reportIds = votesOnOthers.Select(vote => vote.ReportId).Distinct().ToList();
        var reports = await db.CommunityReports.Where(report => reportIds.Contains(report.Id)).ToListAsync(cancellationToken);
        foreach (var vote in votesOnOthers)
        {
            var report = reports.SingleOrDefault(item => item.Id == vote.ReportId);
            if (report is null) continue;
            if (vote.Kind == "confirm") report.Confirmations = Math.Max(0, report.Confirmations - 1);
            else report.Contested = Math.Max(0, report.Contested - 1);
        }
    }
    db.CommunityReportVotes.RemoveRange(db.CommunityReportVotes.Where(vote => authoredReportIds.Contains(vote.ReportId) || vote.UserId == userId));
    db.CommunityReports.RemoveRange(db.CommunityReports.Where(report => report.UserId == userId));
    db.FavoriteSpots.RemoveRange(db.FavoriteSpots.Where(item => item.UserId == userId));
    db.EnabledSpots.RemoveRange(db.EnabledSpots.Where(item => item.UserId == userId));
    db.ForecastAlerts.RemoveRange(db.ForecastAlerts.Where(item => item.UserId == userId));
    db.Notifications.RemoveRange(db.Notifications.Where(item => item.UserId == userId));
    db.PushSubscriptions.RemoveRange(db.PushSubscriptions.Where(item => item.UserId == userId));
    db.UserPreferences.RemoveRange(db.UserPreferences.Where(item => item.UserId == userId));
    db.RefreshTokens.RemoveRange(db.RefreshTokens.Where(item => item.UserId == userId));
    db.BillingSubscriptions.RemoveRange(db.BillingSubscriptions.Where(item => item.UserId == userId));
    db.BillingCustomers.RemoveRange(db.BillingCustomers.Where(item => item.UserId == userId));
    db.Users.Remove(target);
    await db.SaveChangesAsync(cancellationToken);
    foreach (var slug in personalSpots.Select(spot => spot.Slug))
        await cache.InvalidateLocationAsync(slug, cancellationToken);
}

static async Task RemoveSpotDependentsAsync(TaNoMarDbContext db, Guid spotId, CancellationToken cancellationToken)
{
    var reportIds = await db.CommunityReports.Where(report => report.FishingSpotId == spotId).Select(report => report.Id).ToListAsync(cancellationToken);
    db.CommunityReportVotes.RemoveRange(db.CommunityReportVotes.Where(vote => reportIds.Contains(vote.ReportId)));
    db.CommunityReports.RemoveRange(db.CommunityReports.Where(report => report.FishingSpotId == spotId));
    db.FavoriteSpots.RemoveRange(db.FavoriteSpots.Where(item => item.FishingSpotId == spotId));
    db.EnabledSpots.RemoveRange(db.EnabledSpots.Where(item => item.FishingSpotId == spotId));
    db.FishingSpotWebcams.RemoveRange(db.FishingSpotWebcams.Where(item => item.FishingSpotId == spotId));
    db.ForecastAlerts.RemoveRange(db.ForecastAlerts.Where(item => item.FishingSpotId == spotId));
}
static FishingForecast ApplyIdealWindSettings(FishingForecast forecast, IEnumerable<FishingSpot> spots, IReadOnlyDictionary<Guid, int?> settings)
{
    var bySlug = spots.ToDictionary(spot => spot.Slug, StringComparer.Ordinal);
    return forecast with
    {
        Ranking = forecast.Ranking.Select(item =>
        {
            if (!bySlug.TryGetValue(item.Id, out var spot) || !settings.TryGetValue(spot.Id, out var idealWindDirection)) return item;
            return FishingWindPreference.Apply(item, idealWindDirection, spot.SeaOrientationDegrees, spot.Profile);
        }).OrderByDescending(item => item.Score).ToList()
    };
}
static async Task<HashSet<Guid>> VisibleWebcamSpotIdsAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    if (!await ShowLiveWebcamsEnabledAsync(db, cancellationToken))
        return [];
    return await ActiveWebcamSpotIdsAsync(db, cancellationToken);
}

static Task<HashSet<Guid>> ActiveWebcamSpotIdsAsync(TaNoMarDbContext db, CancellationToken cancellationToken) =>
    db.FishingSpotWebcams.AsNoTracking()
        .Where(item => item.IsActive)
        .Select(item => item.FishingSpotId)
        .ToHashSetAsync(cancellationToken);

static object ForecastAlertDto(ForecastAlert alert, FishingSpot spot) => new
{
    id = alert.Id,
    spotId = spot.Slug,
    spotName = spot.Name,
    minimumScore = alert.MinimumScore,
    leadHours = alert.LeadHours,
    isActive = alert.IsActive,
    lastNotifiedDate = alert.LastNotifiedDate,
    createdAt = alert.CreatedAt,
    updatedAt = alert.UpdatedAt
};
static object ReportDto(CommunityReport report, FishingSpot spot, string? myVote, bool isMine, string authorName) => new
{
    id = report.Id,
    spotId = spot.Slug,
    spotName = spot.Name,
    type = report.Type,
    comment = report.Comment,
    authorName,
    createdAt = report.CreatedAt,
    expiresAt = report.ExpiresAt,
    confirmations = report.Confirmations,
    contested = report.Contested,
    myVote,
    isMine
};
static string AuthorName(string? name) =>
    string.IsNullOrWhiteSpace(name) ? "Pescador" : name.Trim();
static string LabelForReportType(string type) => type == "perigo" ? "perigo" : "condição";
static void AddNotification(TaNoMarDbContext db, Guid userId, string title, string body, string? region = null) =>
    db.Notifications.Add(new Notification { UserId = userId, Title = title, Body = body, Region = region });
static void DispatchCreated(NotificationRealtimeHub hub, WebPushQueue push, Guid userId, string title, string body)
{
    hub.Publish(userId, true);
    push.Enqueue(userId, title, body);
}
static async Task<bool> HasUnreadAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken)
{
    var preferredRegions = await PreferredRegionsAsync(db, userId, cancellationToken);
    var regions = await db.Notifications.AsNoTracking().Where(item => item.UserId == userId && item.RemovedAt == null && item.ExpiresAt > DateTimeOffset.UtcNow && item.ReadAt == null).Select(item => item.Region).ToListAsync(cancellationToken);
    return regions.Any(region => region is null || SpotRules.IsInPreferredRegion(region, preferredRegions));
}
static async Task WriteSseEvent(HttpContext context, SemaphoreSlim gate, object payload, CancellationToken cancellationToken)
{
    await gate.WaitAsync(cancellationToken);
    try
    {
        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(payload)}\n\n", cancellationToken);
        await context.Response.Body.FlushAsync(cancellationToken);
    }
    finally
    {
        gate.Release();
    }
}
static bool IsDuplicateSpot(IEnumerable<FishingSpot> spots, string name, double? latitude, double? longitude) =>
    spots.Any(spot => spot.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
        || (latitude is not null
            && longitude is not null
            && spot.Latitude != null
            && spot.Longitude != null
            && DistanceMeters(spot.Latitude.Value, spot.Longitude.Value, latitude.Value, longitude.Value) <= 200));
static void ApplyPersonalSpot(FishingSpot spot, PersonalSpotRequest request)
{
    var shared = request.Shared;
    spot.Name = request.Name.Trim();
    spot.Description = request.Description;
    spot.City = request.City ?? spot.City;
    spot.State = request.State ?? spot.State;
    spot.Region = SpotRules.NormalizeRegion(request.Region);
    spot.Latitude = request.Latitude;
    spot.Longitude = request.Longitude;
    spot.SeaOrientationDegrees = request.SeaOrientationDegrees;
    spot.Profile = SpotRules.NormalizeProfile(request.Profile);
    if (shared)
    {
        if (spot.Visibility != "shared" || !spot.IsApproved)
        {
            spot.Visibility = "shared";
            spot.IsApproved = false;
        }
    }
    else
    {
        spot.Visibility = "private";
        spot.IsApproved = true;
    }
}
static async Task<IResult> VoteReportAsync(Guid id, string kind, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.AsNoTracking().SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    if (!plan.CanCommunityVote)
        return Results.BadRequest(new { code = "plan_required", detail = "Confirmar ou contestar um relato exige uma assinatura.", requiredPlan = PlanRules.RequiredPlanLabel });
    var report = await db.CommunityReports.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (report is null || report.ExpiresAt <= DateTimeOffset.UtcNow) return Results.NotFound();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Id == report.FishingSpotId, cancellationToken);
    if (spot is null || !SpotRules.CanSee(spot, user)) return Results.NotFound();
    var preferredRegions = await PreferredRegionsAsync(db, user.Id, cancellationToken);
    if (!SpotRules.IsInPreferredRegion(spot, preferredRegions)) return Results.Forbid();
    if (report.UserId == user.Id) return Results.Forbid();
    var vote = await db.CommunityReportVotes.SingleOrDefaultAsync(item => item.ReportId == id && item.UserId == user.Id, cancellationToken);
    if (vote is not null && vote.Kind == kind) return Results.Conflict(new { code = "already_voted", detail = "Você já registrou este voto." });
    if (vote is not null)
    {
        if (vote.Kind == "confirm") report.Confirmations = Math.Max(0, report.Confirmations - 1);
        else report.Contested = Math.Max(0, report.Contested - 1);
        vote.Kind = kind;
    }
    else
    {
        db.CommunityReportVotes.Add(new CommunityReportVote { ReportId = id, UserId = user.Id, Kind = kind });
    }
    if (kind == "confirm") report.Confirmations++;
    else report.Contested++;
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}
static HashSet<string> OwnerSpotIds(IEnumerable<FishingSpot> spots, User user) =>
    spots.Where(spot => SpotRules.Owns(spot, user)).Select(spot => spot.Slug).ToHashSet(StringComparer.Ordinal);
static Dictionary<string, string> SpotVisibilities(IEnumerable<FishingSpot> spots) =>
    spots.ToDictionary(spot => spot.Slug, spot => spot.Visibility, StringComparer.Ordinal);
static Task<HashSet<string>> OwnerSpotSlugsAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    db.FishingSpots.AsNoTracking().Where(spot => spot.OwnerUserId == userId).Select(spot => spot.Slug).ToHashSetAsync(StringComparer.Ordinal, cancellationToken);
static object ForecastDayDto(FishingForecast forecast, bool paid, string bestHoursMode, HashSet<string>? ownerSpotIds = null, IReadOnlyDictionary<string, string>? visibilities = null, bool includeSelectableHours = false) => new { date = forecast.Date, ranking = forecast.Ranking.Select(item => ForecastItemDto(item, paid, bestHoursMode, ownerSpotIds, visibilities, includeSelectableHours)).ToList(), unavailableSpotIds = forecast.Errors.Select(error => error.Location).ToList() };
static object ForecastRefreshDto(IEnumerable<FishingForecast> forecasts, ForecastRefreshSnapshot snapshot)
{
    var items = forecasts.ToList();
    var dataUpdatedAt = items.Where(item => item.DataUpdatedAt.HasValue)
        .Select(item => item.DataUpdatedAt!.Value)
        .DefaultIfEmpty()
        .Min();
    var hasData = items.Any(item => item.Ranking.Count > 0);
    var hasStaleData = items.Any(item => item.HasStaleData);
    var state = snapshot.PendingSpotIds.Count > 0
        ? hasData ? "updating" : "preparing"
        : snapshot.FailedSpotIds.Count > 0
            ? hasData ? "degraded" : "unavailable"
            : hasStaleData ? "stale" : "fresh";
    return new
    {
        state,
        dataUpdatedAt = dataUpdatedAt == default ? (DateTimeOffset?)null : dataUpdatedAt,
        pendingSpotIds = snapshot.PendingSpotIds,
        failedSpotIds = snapshot.FailedSpotIds
    };
}
static object MarineLockedDto(string spotId, DateOnly date)
{
    object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = PlanRules.RequiredPlanLabel };
    return new { spotId, date, waves = Locked(), wavePeriod = Locked(), swell = Locked(), waterTemperature = Locked(), atmosphericPressure = Locked(), tide = Locked() };
}
static object MarineDto(string spotId, DateOnly date, FishingLocationForecast forecast, object tide)
{
    var hours = forecast.Hours ?? [];
    var reference = forecast.BestHour ?? hours.FirstOrDefault();
    return new
    {
        spotId,
        date,
        waves = MarineSeries(hours, reference, hour => hour.WaveMeters, "m", 2, hour => hour.WaveDirection),
        wavePeriod = MarineSeries(hours, reference, hour => hour.WavePeriodSeconds, "s", 1),
        swell = MarineSeries(hours, reference, hour => hour.SwellMeters, "m", 2, hour => hour.SwellDirection, hour => $"{FormatPt(hour.SwellPeriodSeconds, "0.#")} s"),
        waterTemperature = MarineSeries(hours, reference, hour => hour.WaterTemperatureC, "°C", 1),
        atmosphericPressure = MarineSeries(hours, reference, hour => hour.PressureHpa, "hPa", 0, detail: _ => PressureTrend(hours, reference)),
        tide
    };
}
static object MarineSeries(
    IReadOnlyList<FishingHourForecast> hours,
    FishingHourForecast? reference,
    Func<FishingHourForecast, double> selector,
    string unit,
    int digits,
    Func<FishingHourForecast, string?>? direction = null,
    Func<FishingHourForecast, string?>? detail = null)
{
    object Available(object value) => new { state = "available", value };
    if (reference is null || hours.Count == 0)
        return Available(new { current = "n/d", range = "n/d", points = Array.Empty<object>() });
    var values = hours.Select(selector).ToList();
    var current = selector(reference);
    return Available(new
    {
        current = $"{FormatPt(current, $"0.{new string('0', digits)}")} {unit}".Trim(),
        range = $"{FormatPt(values.Min(), $"0.{new string('0', digits)}")}–{FormatPt(values.Max(), $"0.{new string('0', digits)}")} {unit}".Trim(),
        direction = direction?.Invoke(reference),
        detail = detail?.Invoke(reference),
        points = hours.Select(hour => new { time = hour.Time, value = Math.Round(selector(hour), digits, MidpointRounding.ToEven) }).ToList()
    });
}
static object TideFromForecast(FishingLocationForecast forecast, DateOnly date, DateOnly today)
{
    var tablePoints = (forecast.TidePoints ?? [])
        .Select(point => (point.Time, point.Height))
        .ToList();
    var tableExtremes = (forecast.TideExtremes ?? [])
        .Select(item => new TideExtremePoint(item.Time, item.Type, item.HeightMeters))
        .ToList();
    if (tablePoints.Count > 0 || tableExtremes.Count > 0)
        return TideTable(tablePoints, tableExtremes, date, today, forecast.TideAttribution);

    var hours = forecast.Hours ?? [];
    var points = hours
        .Where(hour => hour.SeaLevelHeightMsl.HasValue)
        .Select(hour => (hour.Time, Height: hour.SeaLevelHeightMsl!.Value))
        .ToList();
    if (points.Count < 3) return new { state = "unavailable" };
    return TideTable(
        points,
        TideCurve.Extremes(hours),
        date,
        today,
        "Nível do mar modelado (Open-Meteo). Não é tábua oficial.");
}

static string? PressureTrend(IReadOnlyList<FishingHourForecast> hours, FishingHourForecast? reference)
{
    if (hours.Count < 2 || reference is null) return null;
    var previous = hours.LastOrDefault(hour => string.CompareOrdinal(hour.Time, reference.Time) < 0) ?? hours[0];
    var delta = reference.PressureHpa - previous.PressureHpa;
    if (delta > 1) return "em aumento";
    if (delta < -1) return "em queda";
    return "estável";
}

static object TideTable(
    IReadOnlyList<(string Time, double Height)> points,
    IReadOnlyList<TideExtremePoint> extremes,
    DateOnly date,
    DateOnly today,
    string? attribution)
{
    if (points.Count == 0 && extremes.Count == 0) return new { state = "unavailable" };
    var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).DateTime;
    var referenceTime = date == today ? $"{now.Hour:00}:{now.Minute:00}" : "12:00";
    var current = points.LastOrDefault(item => string.CompareOrdinal(item.Time, referenceTime) <= 0);
    if (current.Time is null && points.Count > 0) current = points[0];
    var nextHeight = points.FirstOrDefault(item => current.Time is not null && string.CompareOrdinal(item.Time, current.Time) > 0);
    var phase = nextHeight.Time is null
        ? "n/d"
        : nextHeight.Height >= current.Height ? "Enchente" : "Vazante";
    if (nextHeight.Time is null && extremes.Count > 0)
    {
        var upcoming = extremes.FirstOrDefault(item => string.CompareOrdinal(item.Time, referenceTime) > 0)
            ?? extremes[0];
        phase = upcoming.Type == "preamar" ? "Enchente" : "Vazante";
    }
    var nextExtreme = extremes.FirstOrDefault(item => string.CompareOrdinal(item.Time, referenceTime) > 0)
        ?? extremes.FirstOrDefault();
    var nextLabel = nextExtreme is null
        ? "n/d"
        : $"{(nextExtreme.Type == "preamar" ? "Preamar" : "Baixa-mar")} {nextExtreme.Time} · {FormatMeasure(nextExtreme.HeightMeters, "0.00", "m")}";
    var currentHeight = current.Time is null ? nextExtreme?.HeightMeters : current.Height;
    if (currentHeight is null) return new { state = "unavailable" };
    return new
    {
        state = "available",
        value = new
        {
            current = $"{FormatMeasure(currentHeight.Value, "0.00", "m")}",
            phase,
            nextExtreme = nextLabel,
            attribution,
            extremes = extremes.Select(item => new { type = item.Type, time = item.Time, height = FormatMeasure(item.HeightMeters, "0.00", "m") }).ToList(),
            points = points.Select(item => new { time = item.Time, value = Math.Round(item.Height, 2, MidpointRounding.ToEven) }).ToList()
        }
    };
}
static object ForecastItemDto(FishingLocationForecast item, bool paid, string bestHoursMode, HashSet<string>? ownerSpotIds = null, IReadOnlyDictionary<string, string>? visibilities = null, bool includeSelectableHours = false)
{
    var hour = item.BestHour;
    var bestHours = item.BestHours.Take(PlanRules.BestHourCount(bestHoursMode) ?? 3).ToArray();
    object Available(object value) => new { state = "available", value };
    object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = PlanRules.RequiredPlanLabel };
    var classification = ForecastHourWindowDto.Classification(item.Score);
    var highlights = ForecastHourWindowDto.Highlights(hour);
    var windOrigin = string.IsNullOrEmpty(hour?.WindOrigin) ? null : hour.WindOrigin;
    return new
    {
        spotId = item.Id,
        spotName = item.Location,
        isOwner = ownerSpotIds is not null && ownerSpotIds.Contains(item.Id),
        visibility = visibilities is not null && visibilities.TryGetValue(item.Id, out var visibilityValue) ? visibilityValue : "official",
        score = Available(item.Score),
        classification = Available(classification),
        bestHours = Available(bestHours.Select(best => best.Time).ToArray()),
        bestHourWindows = Available(bestHours.Select(best => ForecastHourWindowDto.Create(best, paid)).ToArray()),
        selectableHourWindows = includeSelectableHours && PlanRules.CanSelectAnyHour(bestHoursMode)
            ? Available(item.Hours.Select(item => ForecastHourWindowDto.Create(item, paid)).ToArray())
            : null,
        metricsHour = hour?.Time,
        windOrigin,
        highlights,
        wind = Available(hour is null ? "n/d" : $"{FormatPt(hour.WindSpeedKmh, "0.#")} km/h {hour.WindDirection}"),
        gusts = Available(hour is null ? "n/d" : FormatMeasure(hour.WindGustKmh, "0.#", "km/h")),
        waves = paid ? Available(hour is null ? "n/d" : FormatMeasure(hour.WaveMeters, "0.00", "m")) : Locked(),
        waveDirection = string.IsNullOrEmpty(hour?.WaveDirection) ? null : hour.WaveDirection,
        wavePeriod = paid ? Available(hour is null ? "n/d" : FormatMeasure(hour.WavePeriodSeconds, "0.#", "s")) : Locked(),
        swell = paid ? Available(hour is null ? "n/d" : FormatMeasure(hour.SwellMeters, "0.00", "m")) : Locked(),
        rain = Available(hour is null ? "n/d" : $"{FormatPt(hour.RainMm, "0.#")} mm ({hour.RainProbability}%)"),
        airTemperature = Available(hour is null ? "n/d" : FormatMeasure(hour.AirTemperatureC, "0.#", "°C")),
        waterTemperature = paid ? Available(hour is null ? "n/d" : FormatMeasure(hour.WaterTemperatureC, "0.#", "°C")) : Locked(),
        pressure = paid ? Available(hour is null ? "n/d" : FormatMeasure(hour.PressureHpa, "0", "hPa")) : Locked()
    };
}

static string FormatPt(double value, string format) => ForecastHourWindowDto.FormatPt(value, format);
static string FormatMeasure(double value, string format, string unit) => ForecastHourWindowDto.FormatMeasure(value, format, unit);

static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
{
    var radians = Math.PI / 180;
    var a = Math.Pow(Math.Sin((lat2 - lat1) * radians / 2), 2) + Math.Cos(lat1 * radians) * Math.Cos(lat2 * radians) * Math.Pow(Math.Sin((lon2 - lon1) * radians / 2), 2);
    return 6371000 * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
}

static Task<List<PartnerOffer>> PartnerOffersByIdsAsync(TaNoMarDbContext db, IEnumerable<Guid> partnerIds, CancellationToken cancellationToken)
{
    var ids = partnerIds.ToList();
    return db.PartnerOffers.AsNoTracking().Where(item => ids.Contains(item.PartnerId)).ToListAsync(cancellationToken);
}

static object PartnerDto(Partner partner, IEnumerable<PartnerOffer> offers) => new
{
    id = partner.Slug,
    slug = partner.Slug,
    name = partner.Name,
    category = partner.Category,
    tagline = partner.Tagline,
    about = partner.About,
    city = partner.City,
    whatsApp = partner.WhatsApp,
    instagram = partner.Instagram,
    website = partner.Website,
    mapsUrl = partner.MapsUrl,
    coverImageUrl = partner.CoverImageUrl,
    isFeatured = partner.IsFeatured,
    offers = offers.Select(OfferDto).ToList()
};

static object AdminPartnerDto(Partner partner, IEnumerable<PartnerOffer> offers) => new
{
    id = partner.Slug,
    slug = partner.Slug,
    name = partner.Name,
    category = partner.Category,
    tagline = partner.Tagline,
    about = partner.About,
    city = partner.City,
    whatsApp = partner.WhatsApp,
    instagram = partner.Instagram,
    website = partner.Website,
    mapsUrl = partner.MapsUrl,
    coverImageUrl = partner.CoverImageUrl,
    isPublished = partner.IsPublished,
    isFeatured = partner.IsFeatured,
    sortOrder = partner.SortOrder,
    createdAt = partner.CreatedAt,
    updatedAt = partner.UpdatedAt,
    offers = offers.Select(OfferDto).ToList()
};

static object OfferDto(PartnerOffer offer) => new
{
    title = offer.Title,
    description = offer.Description,
    priceLabel = offer.PriceLabel,
    endsAt = offer.EndsAt
};

static IResult? ValidatePartner(PartnerRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { code = "invalid_partner", detail = "Informe o nome do parceiro." });
    if (!PartnerRules.IsCategory(request.Category?.Trim().ToLowerInvariant()))
        return Results.BadRequest(new { code = "invalid_category", detail = "Use loja, guia, hospedagem ou outro." });
    var whatsApp = PartnerRules.DigitsOrNull(request.WhatsApp);
    var instagram = PartnerRules.TrimToNull(request.Instagram);
    var website = PartnerRules.TrimToNull(request.Website);
    var mapsUrl = PartnerRules.TrimToNull(request.MapsUrl);
    if (request.IsPublished && !PartnerRules.HasContact(whatsApp, instagram, website, mapsUrl))
        return Results.BadRequest(new { code = "missing_contact", detail = "Para publicar, informe WhatsApp, Instagram, site ou Maps." });
    if (request.Offers?.Any(offer => string.IsNullOrWhiteSpace(offer.Title)) == true)
        return Results.BadRequest(new { code = "invalid_offer", detail = "Cada oferta precisa de um título." });
    return null;
}

static string UniquePartnerSlug(PartnerRequest request, IReadOnlyCollection<string> used, string? current = null)
{
    var requested = PartnerRules.TrimToNull(request.Slug);
    var seed = requested is null ? PartnerRules.Slugify(request.Name) : PartnerRules.Slugify(requested);
    if (current is not null && seed == current) return current;
    var slug = seed;
    var index = 2;
    while (used.Contains(slug, StringComparer.OrdinalIgnoreCase))
    {
        slug = $"{seed}-{index}";
        index++;
    }
    return slug;
}

static void ApplyPartner(Partner partner, PartnerRequest request, string slug)
{
    partner.Slug = slug;
    partner.Name = request.Name.Trim();
    partner.Category = request.Category.Trim().ToLowerInvariant();
    partner.Tagline = PartnerRules.TrimToNull(request.Tagline);
    partner.About = PartnerRules.TrimToNull(request.About);
    partner.City = PartnerRules.TrimToNull(request.City) ?? "";
    partner.WhatsApp = PartnerRules.DigitsOrNull(request.WhatsApp);
    partner.Instagram = PartnerRules.TrimToNull(request.Instagram)?.TrimStart('@');
    partner.Website = PartnerRules.TrimToNull(request.Website);
    partner.MapsUrl = PartnerRules.TrimToNull(request.MapsUrl);
    partner.CoverImageUrl = PartnerRules.TrimToNull(request.CoverImageUrl);
    partner.IsPublished = request.IsPublished;
    partner.IsFeatured = request.IsFeatured;
    partner.SortOrder = request.SortOrder;
    partner.UpdatedAt = DateTimeOffset.UtcNow;
}

static void ReplacePartnerOffers(TaNoMarDbContext db, Guid partnerId, PartnerOfferRequest[]? offers)
{
    if (offers is null) return;
    var order = 0;
    foreach (var offer in offers)
    {
        db.PartnerOffers.Add(new PartnerOffer
        {
            PartnerId = partnerId,
            Title = offer.Title.Trim(),
            Description = PartnerRules.TrimToNull(offer.Description),
            PriceLabel = PartnerRules.TrimToNull(offer.PriceLabel),
            EndsAt = offer.EndsAt,
            SortOrder = offer.SortOrder ?? order
        });
        order++;
    }
}

record BillingCheckoutRequest(string? PlanCode, string? Cycle);
record GoogleLoginRequest(string Credential);
record PreferencesRequest(string? Region, string? WindUnit, bool? ForecastNotifications, string? Focus, string[]? VisibleMetrics);
record ForecastAlertRequest(string SpotId, double MinimumScore, int LeadHours, bool IsActive = true);
record FavoriteRequest(string SpotId, bool IsFavorite);
record EnabledSpotRequest(string SpotId, bool IsEnabled);
record IdealWindRequest(string SpotId, int? IdealWindDirectionDegrees);
record PersonalSpotRequest(string Name, double? Latitude, double? Longitude, string? Description, string? City, string? State, string? Region, bool Shared, double? SeaOrientationDegrees, string? Profile);
record OfficialSpotRequest(string Name, double? Latitude, double? Longitude, string? Description, string? City, string? State, string? Region, double? SeaOrientationDegrees, string? Profile, string? Type, string? FishingEnvironment, string? AccessType, string? RestrictionNotes, bool IsActive = true, bool IsFreeDefault = false);
record CommunityReportRequest(string SpotId, string Type, string? Comment);
record PushSubscriptionRequest(string? Endpoint, string? P256dh, string? Auth);
record AdminPlanRequest(string PlanCode);
record AdminPlanConfigRequest(
    string Name,
    string? Tagline,
    int MonthlyPriceCents,
    int SortOrder,
    bool Featured,
    bool Enabled,
    int MaxForecastDays,
    string? BestHoursMode,
    int MaxFavorites,
    int MaxPersonalSpots,
    int MaxAlerts,
    bool CanMarine,
    bool CanDiary,
    bool CanOffline,
    bool CanCustomMetrics,
    bool? CanCustomWind,
    bool CanCommunityVote,
    bool CanRankingEmphasis,
    bool CanLiveWebcams);
record AdminActiveRequest(bool IsActive);
record AdminRoleRequest(string Role);
record AdminWorkerRequest(bool IsEnabled, string? CronExpression);
record PartnerOfferRequest(string Title, string? Description, string? PriceLabel, DateTimeOffset? EndsAt, int? SortOrder);
record PartnerRequest(string? Slug, string Name, string Category, string? Tagline, string? About, string? City, string? WhatsApp, string? Instagram, string? Website, string? MapsUrl, string? CoverImageUrl, bool IsPublished, bool IsFeatured, int SortOrder, PartnerOfferRequest[]? Offers);
record PlatformSettingsRequest(bool? ShowPartners, bool? ShowAppFocus, bool? ShowLiveWebcams);
