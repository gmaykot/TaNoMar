using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TaNoMar.Api.Auth;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using TaNoMar.Api.Notifications;
using TaNoMar.Api.Options;

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
builder.Services.AddTransient<FishingForecastService>();
builder.Services.AddHostedService<FishingForecastWarmupWorker>();
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
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", at = DateTimeOffset.UtcNow }));

var api = app.MapGroup("/api/v1");
api.MapPost("/auth/google", async (GoogleLoginRequest request, TaNoMarDbContext db, AuthTokenService tokens, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, HttpContext context, CancellationToken cancellationToken) =>
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
    ApplyBootstrapAdmin(user, payload.Email, payload.Subject, options.Value);
    if (!user.IsActive) return Results.Forbid();
    var refresh = tokens.CreateRefreshToken();
    db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = tokens.HashRefreshToken(refresh), ExpiresAt = DateTimeOffset.UtcNow.AddDays(options.Value.RefreshTokenDays) });
    await db.SaveChangesAsync(cancellationToken);
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

api.MapGet("/me", async (ClaimsPrincipal principal, TaNoMarDbContext db, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (ApplyBootstrapAdmin(user, user.Email, user.GoogleSubject, options.Value))
        await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(await UserDtoAsync(user, db, cancellationToken));
}).RequireAuthorization();

api.MapGet("/fishing-spots", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var favoriteIds = await db.FavoriteSpots.Where(item => item.UserId == user.Id).Select(item => item.FishingSpotId).ToListAsync(cancellationToken);
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    var spots = await db.FishingSpots.AsNoTracking().Where(spot => spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved) || spot.OwnerUserId == user.Id).OrderBy(spot => spot.Name).ToListAsync(cancellationToken);
    return Results.Ok(spots.Select(spot => SpotDtoProjection(spot, user, favoriteIds.Contains(spot.Id), SpotRules.IsEnabledForUser(spot, enabledSettings))).ToList());
}).RequireAuthorization();

api.MapPost("/fishing-spots", async (PersonalSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var currentCount = await db.FishingSpots.CountAsync(spot => spot.OwnerUserId == user.Id, cancellationToken);
    if (currentCount >= plan.MaxPersonalSpots) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais locais pessoais." });
    if (request.Latitude is null || request.Longitude is null || string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { detail = "Nome e coordenadas são obrigatórios." });
    var existingSpots = await db.FishingSpots.AsNoTracking().ToListAsync(cancellationToken);
    if (IsDuplicateSpot(existingSpots, request.Name.Trim(), request.Latitude.Value, request.Longitude.Value))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    var shared = request.Shared;
    var spot = new FishingSpot
    {
        Slug = $"pessoal-{Guid.NewGuid():N}",
        Name = request.Name.Trim(),
        Description = request.Description,
        City = request.City ?? "",
        State = request.State ?? "SC",
        Region = request.Region ?? "Meu mapa",
        Type = "personalizado",
        Visibility = shared ? "shared" : "private",
        IsApproved = !shared,
        OwnerUserId = user.Id,
        Latitude = request.Latitude,
        Longitude = request.Longitude,
        SeaOrientationDegrees = request.SeaOrientationDegrees ?? 0,
        Profile = SpotRules.NormalizeProfile(request.Profile)
    };
    db.FishingSpots.Add(spot);
    db.EnabledSpots.Add(new EnabledSpot { UserId = user.Id, FishingSpotId = spot.Id, IsEnabled = true });
    await db.SaveChangesAsync(cancellationToken);
    await TryWarmSpotAsync(fishing, spot, cancellationToken);
    return Results.Created($"/api/v1/fishing-spots/{spot.Slug}", SpotDtoProjection(spot, user, false, true));
}).RequireAuthorization();

api.MapPut("/fishing-spots/{id}", async (string id, PersonalSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.Owns(spot, user) || spot.Visibility == "official") return Results.Forbid();
    if (request.Latitude is null || request.Longitude is null || string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { detail = "Nome e coordenadas são obrigatórios." });
    var others = await db.FishingSpots.AsNoTracking().Where(item => item.Id != spot.Id).ToListAsync(cancellationToken);
    if (IsDuplicateSpot(others, request.Name.Trim(), request.Latitude.Value, request.Longitude.Value))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um local com esse nome ou muito próximo." });
    ApplyPersonalSpot(spot, request);
    await db.SaveChangesAsync(cancellationToken);
    var favorite = await db.FavoriteSpots.AnyAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    return Results.Ok(SpotDtoProjection(spot, user, favorite, SpotRules.IsEnabledForUser(spot, enabledSettings)));
}).RequireAuthorization();

api.MapDelete("/fishing-spots/{id}", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.Owns(spot, user) || spot.Visibility == "official") return Results.Forbid();
    var reportIds = await db.CommunityReports.Where(report => report.FishingSpotId == spot.Id).Select(report => report.Id).ToListAsync(cancellationToken);
    db.CommunityReportVotes.RemoveRange(db.CommunityReportVotes.Where(vote => reportIds.Contains(vote.ReportId)));
    db.CommunityReports.RemoveRange(db.CommunityReports.Where(report => report.FishingSpotId == spot.Id));
    db.FavoriteSpots.RemoveRange(db.FavoriteSpots.Where(item => item.FishingSpotId == spot.Id));
    db.EnabledSpots.RemoveRange(db.EnabledSpots.Where(item => item.FishingSpotId == spot.Id));
    db.FishingSpots.Remove(spot);
    await db.SaveChangesAsync(cancellationToken);
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
    return Results.Ok(spots.Select(spot => SpotDtoProjection(spot, actor!, false)).ToList());
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots/{id}/approve", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, NotificationRealtimeHub hub, WebPushQueue push, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "shared", cancellationToken);
    if (spot is null) return Results.NotFound();
    spot.IsApproved = true;
    Guid? ownerId = spot.OwnerUserId;
    const string title = "Local publicado";
    var body = $"“{spot.Name}” agora aparece para a comunidade.";
    if (ownerId is Guid recipientId)
        AddNotification(db, recipientId, title, body);
    await db.SaveChangesAsync(cancellationToken);
    await TryWarmSpotAsync(fishing, spot, cancellationToken);
    if (ownerId is Guid notifiedId)
        DispatchCreated(hub, push, notifiedId, title, body);
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
    if (ownerId is Guid recipientId)
        AddNotification(db, recipientId, title, body);
    await db.SaveChangesAsync(cancellationToken);
    if (ownerId is Guid notifiedId)
        DispatchCreated(hub, push, notifiedId, title, body);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/admin/users", async (ClaimsPrincipal principal, TaNoMarDbContext db, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var users = await db.Users.AsNoTracking().OrderBy(item => item.Name).ToListAsync(cancellationToken);
    var plans = await db.Plans.AsNoTracking().ToDictionaryAsync(item => item.Code, cancellationToken);
    var activeAdmins = users.Count(item => item.IsActive && string.Equals(item.Role, "Admin", StringComparison.Ordinal));
    return Results.Ok(users.Select(item => AdminUserDto(item, ResolvePlan(plans, item.PlanCode), actor!, options.Value, activeAdmins)).ToList());
}).RequireAuthorization();

api.MapPut("/admin/users/{id:guid}/plan", async (Guid id, AdminPlanRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, NotificationRealtimeHub hub, WebPushQueue push, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var planCode = request.PlanCode?.Trim().ToLowerInvariant();
    if (planCode is not ("free" or "premium")) return Results.BadRequest(new { code = "invalid_plan", detail = "Use o plano free ou premium." });
    var target = await db.Users.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (target is null) return Results.NotFound();
    if (MatchesBootstrapAdmin(target.Email, target.GoogleSubject, options.Value))
        return Results.Conflict(new { code = "bootstrap_locked", detail = "A conta inicial do bootstrap permanece Premium." });
    var plan = await db.Plans.SingleAsync(item => item.Code == planCode, cancellationToken);
    if (!string.Equals(target.PlanCode, plan.Code, StringComparison.Ordinal))
    {
        target.PlanCode = plan.Code;
        const string title = "Plano atualizado";
        var body = $"Seu plano agora é {plan.Name}.";
        AddNotification(db, target.Id, title, body);
        await db.SaveChangesAsync(cancellationToken);
        DispatchCreated(hub, push, target.Id, title, body);
    }
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor!, options.Value, activeAdmins));
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
    return Results.Ok(AdminUserDto(target, plan, actor, options.Value, activeAdmins));
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
    return Results.Ok(new { showPartners = await ShowPartnersEnabledAsync(db, cancellationToken) });
}).RequireAuthorization();

api.MapPut("/admin/settings", async (PlatformSettingsRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var settings = await db.PlatformSettings.SingleAsync(cancellationToken);
    settings.ShowPartners = request.ShowPartners;
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(new { showPartners = settings.ShowPartners });
}).RequireAuthorization();

api.MapPut("/me/preferences", async (PreferencesRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var preferences = await db.UserPreferences.SingleOrDefaultAsync(item => item.UserId == user.Id, cancellationToken) ?? new UserPreference { UserId = user.Id };
    preferences.Region = request.Region ?? preferences.Region;
    preferences.WindUnit = request.WindUnit ?? preferences.WindUnit;
    preferences.ForecastNotifications = request.ForecastNotifications ?? preferences.ForecastNotifications;
    if (preferences.Id == Guid.Empty) db.UserPreferences.Add(preferences);
    else if (db.Entry(preferences).State == EntityState.Detached) db.UserPreferences.Add(preferences);
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(preferences);
}).RequireAuthorization();

api.MapPut("/me/favorites", async (FavoriteRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.CanSee(spot, user) || (spot.Visibility == "shared" && !spot.IsApproved && !SpotRules.Owns(spot, user))) return Results.Forbid();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var favorite = await db.FavoriteSpots.SingleOrDefaultAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    if (request.IsFavorite && favorite is null && await db.FavoriteSpots.CountAsync(item => item.UserId == user.Id, cancellationToken) >= plan.MaxFavorites) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais favoritos." });
    if (request.IsFavorite && favorite is null) { favorite = new FavoriteSpot { UserId = user.Id, FishingSpotId = spot.Id }; db.FavoriteSpots.Add(favorite); }
    if (!request.IsFavorite && favorite is not null) db.FavoriteSpots.Remove(favorite);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPut("/me/enabled-spots", async (EnabledSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.CanSee(spot, user) || (spot.Visibility == "shared" && !spot.IsApproved && !SpotRules.Owns(spot, user))) return Results.Forbid();
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
        await TryWarmSpotAsync(fishing, spot, cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/forecasts/ranking", async (string? emphasis, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!FishingRankingEmphasis.TryParse(emphasis, out var parsedEmphasis))
        return Results.BadRequest(new { detail = "Ênfase inválida. Use wind, wind-more, rain, rain-more, waves ou waves-less." });
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var premium = plan.Code == "premium";
    if (FishingRankingEmphasis.RequiresPremium(parsedEmphasis) && !premium)
        return Results.BadRequest(new { code = "plan_required", detail = "Reordenar o ranking exige o plano Premium.", requiredPlan = "Premium" });
    var enabledSettings = await EnabledSettingsAsync(db, user.Id, cancellationToken);
    var visibleSpots = await db.FishingSpots.AsNoTracking()
        .Where(spot => spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved) || spot.OwnerUserId == user.Id)
        .ToListAsync(cancellationToken);
    var enabledSlugs = visibleSpots.Where(spot => SpotRules.IsEnabledForUser(spot, enabledSettings)).Select(spot => spot.Slug).ToHashSet();
    var days = new List<object>();
    for (var day = 0; day < plan.MaxForecastDays; day++)
    {
        var forecast = await fishing.GetAsync(day, cancellationToken, user.Id, enabledSlugs);
        var ordered = forecast with { Ranking = FishingRankingEmphasis.Order(forecast.Ranking, parsedEmphasis) };
        days.Add(ForecastDayDto(ordered, premium));
    }
    return Results.Ok(new { generatedAt = DateTimeOffset.UtcNow, availableFrom = DateOnly.FromDateTime(DateTime.UtcNow), availableTo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(plan.MaxForecastDays - 1)), days });
}).RequireAuthorization();

api.MapGet("/fishing-spots/{id}/forecast", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == id && (item.Visibility == "official" || (item.Visibility == "shared" && item.IsApproved) || item.OwnerUserId == user.Id), cancellationToken);
    if (spot is null) return Results.NotFound();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var result = new List<object>();
    for (var day = 0; day < plan.MaxForecastDays; day++)
    {
        var forecast = await fishing.GetAsync(day, cancellationToken, user.Id);
        var filtered = forecast with { Ranking = forecast.Ranking.Where(item => item.Id == spot.Slug).ToList() };
        result.Add(ForecastDayDto(filtered, plan.Code == "premium"));
    }
    return Results.Ok(new { spotId = spot.Slug, days = result });
}).RequireAuthorization();

api.MapGet("/fishing-spots/{id}/marine", async (string id, DateOnly? date, ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var spot = await db.FishingSpots.AsNoTracking().SingleOrDefaultAsync(item => item.Slug == id && (item.Visibility == "official" || (item.Visibility == "shared" && item.IsApproved) || item.OwnerUserId == user.Id), cancellationToken);
    if (spot is null) return Results.NotFound();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var targetDate = date ?? fishing.Today();
    var dayOffset = targetDate.DayNumber - fishing.Today().DayNumber;
    if (dayOffset < 0 || dayOffset >= plan.MaxForecastDays) return Results.BadRequest(new { detail = "Data fora da janela do plano." });
    var premium = plan.Code == "premium";
    if (!premium) return Results.Ok(MarineLockedDto(spot.Slug, targetDate));
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
    var now = DateTimeOffset.UtcNow;
    var query = db.CommunityReports.AsNoTracking().Where(report => report.ExpiresAt > now)
        .Join(db.FishingSpots, report => report.FishingSpotId, spot => spot.Id, (report, spot) => new { report, spot })
        .Where(item => item.spot.Visibility == "official" || (item.spot.Visibility == "shared" && item.spot.IsApproved));
    if (!string.IsNullOrWhiteSpace(spotId))
        query = query.Where(item => item.spot.Slug == spotId);
    var rows = await query.OrderByDescending(item => item.report.CreatedAt).ToListAsync(cancellationToken);
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
    if (!SpotRules.IsCommunityVisible(spot)) return Results.Forbid();
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
    var recipientIds = await db.Users.Where(item => item.IsActive && item.Id != user.Id).Select(item => item.Id).ToListAsync(cancellationToken);
    const string title = "Novo relato";
    var body = $"{user.Name} relatou {LabelForReportType(type)} em {spot.Name}.";
    foreach (var recipientId in recipientIds)
        AddNotification(db, recipientId, title, body);
    const string authorTitle = "Relato enviado";
    var authorBody = $"Seu relato de {LabelForReportType(type)} em {spot.Name} foi publicado.";
    AddNotification(db, user.Id, authorTitle, authorBody);
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
    return Results.Ok(await db.Notifications.AsNoTracking().Where(item => item.UserId == user.Id && item.RemovedAt == null && item.ExpiresAt > DateTimeOffset.UtcNow).OrderByDescending(item => item.CreatedAt).Select(item => new { id = item.Id, title = item.Title, body = item.Body, createdAt = item.CreatedAt, readAt = item.ReadAt }).ToListAsync(cancellationToken));
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
    return Results.Ok(ForecastDayDto(await fishing.GetAsync(0, cancellationToken), false));
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
static object AdminUserDto(User item, Plan plan, User actor, TaNoMarOptions options, int activeAdmins)
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
        canChangePlan = protection != "bootstrap",
        canDeactivate = protection is null
    };
}
static bool ApplyBootstrapAdmin(User user, string? email, string? googleSubject, TaNoMarOptions options)
{
    if (!MatchesBootstrapAdmin(email, googleSubject, options)) return false;
    var changed = false;
    if (!string.Equals(user.Role, "Admin", StringComparison.Ordinal))
    {
        user.Role = "Admin";
        changed = true;
    }
    if (!string.Equals(user.PlanCode, "premium", StringComparison.Ordinal))
    {
        user.PlanCode = "premium";
        changed = true;
    }
    return changed;
}
static bool MatchesBootstrapAdmin(string? email, string? googleSubject, TaNoMarOptions options) =>
    (!string.IsNullOrWhiteSpace(options.BootstrapAdminGoogleSubject) && googleSubject == options.BootstrapAdminGoogleSubject)
    || (!string.IsNullOrWhiteSpace(options.BootstrapAdminEmail) && string.Equals(email, options.BootstrapAdminEmail, StringComparison.OrdinalIgnoreCase));
static void SetRefreshCookie(HttpContext context, string value, bool development) => context.Response.Cookies.Append(TaNoMarOptions.RefreshCookieName, value, new CookieOptions { HttpOnly = true, Secure = !development, SameSite = SameSiteMode.Lax, MaxAge = TimeSpan.FromDays(30), Path = "/api/v1/auth" });
static async Task<User?> CurrentUserAsync(ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) { var id = principal.FindFirstValue(ClaimTypes.NameIdentifier); return Guid.TryParse(id, out var userId) ? await db.Users.SingleOrDefaultAsync(user => user.Id == userId, cancellationToken) : null; }
static async Task<bool> ShowPartnersEnabledAsync(TaNoMarDbContext db, CancellationToken cancellationToken)
{
    var settings = await db.PlatformSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
    return settings?.ShowPartners == true;
}

static async Task<object> UserDtoAsync(User user, TaNoMarDbContext db, CancellationToken cancellationToken)
{
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
        entitlements = new { maxForecastDays = plan.MaxForecastDays, maxFavorites = plan.MaxFavorites, maxPersonalSpots = plan.MaxPersonalSpots, maxAlerts = plan.MaxAlerts },
        features = new { showPartners = await ShowPartnersEnabledAsync(db, cancellationToken) },
        preferences = new
        {
            region = preferences?.Region ?? "Florianópolis",
            windUnit = preferences?.WindUnit ?? "kmh",
            forecastNotifications = preferences?.ForecastNotifications ?? true
        }
    };
}
static Task<Dictionary<Guid, bool>> EnabledSettingsAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    db.EnabledSpots.Where(item => item.UserId == userId).ToDictionaryAsync(item => item.FishingSpotId, item => item.IsEnabled, cancellationToken);

static async Task TryWarmSpotAsync(FishingForecastService fishing, FishingSpot spot, CancellationToken cancellationToken)
{
    try
    {
        await fishing.WarmSpotAsync(spot, cancellationToken);
    }
    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
    {
        throw;
    }
    catch
    {
        // O ranking calcula a nota na próxima consulta se o aquecimento falhar.
    }
}

static object SpotDtoProjection(FishingSpot spot, User user, bool favorite = false, bool? enabled = null)
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
        visibility = spot.Visibility,
        profile = spot.Profile,
        latitude = spot.Latitude,
        longitude = spot.Longitude,
        seaOrientationDegrees = spot.SeaOrientationDegrees,
        isFavorite = favorite,
        isEnabled,
        isInRanking = isEnabled,
        isApproved = spot.IsApproved,
        isOwner = SpotRules.Owns(spot, user)
    };
}
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
static void AddNotification(TaNoMarDbContext db, Guid userId, string title, string body) =>
    db.Notifications.Add(new Notification { UserId = userId, Title = title, Body = body });
static void DispatchCreated(NotificationRealtimeHub hub, WebPushQueue push, Guid userId, string title, string body)
{
    hub.Publish(userId, true);
    push.Enqueue(userId, title, body);
}
static Task<bool> HasUnreadAsync(TaNoMarDbContext db, Guid userId, CancellationToken cancellationToken) =>
    db.Notifications.AsNoTracking().AnyAsync(item => item.UserId == userId && item.RemovedAt == null && item.ExpiresAt > DateTimeOffset.UtcNow && item.ReadAt == null, cancellationToken);
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
static bool IsDuplicateSpot(IEnumerable<FishingSpot> spots, string name, double latitude, double longitude) =>
    spots.Any(spot => spot.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
        || (spot.Latitude != null && spot.Longitude != null && DistanceMeters(spot.Latitude.Value, spot.Longitude.Value, latitude, longitude) <= 200));
static void ApplyPersonalSpot(FishingSpot spot, PersonalSpotRequest request)
{
    var shared = request.Shared;
    spot.Name = request.Name.Trim();
    spot.Description = request.Description;
    spot.City = request.City ?? spot.City;
    spot.State = request.State ?? spot.State;
    spot.Region = request.Region ?? spot.Region;
    spot.Latitude = request.Latitude;
    spot.Longitude = request.Longitude;
    spot.SeaOrientationDegrees = request.SeaOrientationDegrees ?? spot.SeaOrientationDegrees;
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
    if (!string.Equals(user.PlanCode, "premium", StringComparison.Ordinal))
        return Results.BadRequest(new { code = "plan_required", detail = "Confirmar ou contestar um relato exige o plano Premium.", requiredPlan = "Premium" });
    var report = await db.CommunityReports.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
    if (report is null || report.ExpiresAt <= DateTimeOffset.UtcNow) return Results.NotFound();
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Id == report.FishingSpotId, cancellationToken);
    if (spot is null || !SpotRules.IsCommunityVisible(spot)) return Results.NotFound();
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
static object ForecastDayDto(FishingForecast forecast, bool premium) => new { date = forecast.Date, ranking = forecast.Ranking.Select(item => ForecastItemDto(item, premium)).ToList(), unavailableSpotIds = forecast.Errors.Select(error => error.Location).ToList() };
static object MarineLockedDto(string spotId, DateOnly date)
{
    object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = "Premium" };
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
        swell = MarineSeries(hours, reference, hour => hour.SwellMeters, "m", 2, hour => hour.SwellDirection, hour => $"{hour.SwellPeriodSeconds:0.#} s"),
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
        current = $"{current.ToString($"0.{new string('0', digits)}")} {unit}".Trim(),
        range = $"{values.Min().ToString($"0.{new string('0', digits)}")}–{values.Max().ToString($"0.{new string('0', digits)}")} {unit}".Trim(),
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
        : $"{(nextExtreme.Type == "preamar" ? "Preamar" : "Baixa-mar")} {nextExtreme.Time} · {nextExtreme.HeightMeters:0.00} m";
    var currentHeight = current.Time is null ? nextExtreme?.HeightMeters : current.Height;
    if (currentHeight is null) return new { state = "unavailable" };
    return new
    {
        state = "available",
        value = new
        {
            current = $"{currentHeight.Value:0.00} m",
            phase,
            nextExtreme = nextLabel,
            attribution,
            extremes = extremes.Select(item => new { type = item.Type, time = item.Time, height = $"{item.HeightMeters:0.00} m" }).ToList(),
            points = points.Select(item => new { time = item.Time, value = Math.Round(item.Height, 2, MidpointRounding.ToEven) }).ToList()
        }
    };
}
static object ForecastItemDto(FishingLocationForecast item, bool premium)
{
    var hour = item.BestHour;
    object Available(object value) => new { state = "available", value };
    object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = "Premium" };
    var classification = item.Score >= 8.5 ? "Excelente" : item.Score >= 7 ? "Muito bom" : item.Score >= 5 ? "Regular" : "Difícil";
    return new { spotId = item.Id, spotName = item.Location, score = Available(item.Score), classification = Available(classification), bestHours = Available(item.BestHours.Select(best => best.Time).ToArray()), wind = Available(hour is null ? "n/d" : $"{hour.WindSpeedKmh:0.#} km/h {hour.WindDirection}"), gusts = Available(hour is null ? "n/d" : $"{hour.WindGustKmh:0.#} km/h"), waves = premium ? Available(hour?.WaveMeters.ToString("0.00") + " m") : Locked(), wavePeriod = premium ? Available(hour?.WavePeriodSeconds.ToString("0.#") + " s") : Locked(), swell = premium ? Available(hour?.SwellMeters.ToString("0.00") + " m") : Locked(), rain = Available(hour is null ? "n/d" : $"{hour.RainMm:0.#} mm ({hour.RainProbability}%)"), airTemperature = Available(hour is null ? "n/d" : $"{hour.AirTemperatureC:0.#} °C"), waterTemperature = premium ? Available(hour?.WaterTemperatureC.ToString("0.#") + " °C") : Locked() };
}

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

record GoogleLoginRequest(string Credential);
record PreferencesRequest(string? Region, string? WindUnit, bool? ForecastNotifications);
record FavoriteRequest(string SpotId, bool IsFavorite);
record EnabledSpotRequest(string SpotId, bool IsEnabled);
record PersonalSpotRequest(string Name, double? Latitude, double? Longitude, string? Description, string? City, string? State, string? Region, bool Shared, double? SeaOrientationDegrees, string? Profile);
record CommunityReportRequest(string SpotId, string Type, string? Comment);
record PushSubscriptionRequest(string? Endpoint, string? P256dh, string? Auth);
record AdminPlanRequest(string PlanCode);
record AdminActiveRequest(bool IsActive);
record PartnerOfferRequest(string Title, string? Description, string? PriceLabel, DateTimeOffset? EndsAt, int? SortOrder);
record PartnerRequest(string? Slug, string Name, string Category, string? Tagline, string? About, string? City, string? WhatsApp, string? Instagram, string? Website, string? MapsUrl, string? CoverImageUrl, bool IsPublished, bool IsFeatured, int SortOrder, PartnerOfferRequest[]? Offers);
record PlatformSettingsRequest(bool ShowPartners);
