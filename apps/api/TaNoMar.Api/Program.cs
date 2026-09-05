using System.Security.Claims;
using System.Threading.RateLimiting;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TaNoMar.Api.Auth;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using TaNoMar.Api.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<TaNoMarOptions>(builder.Configuration.GetSection(TaNoMarOptions.SectionName));
builder.Services.PostConfigure<TaNoMarOptions>(options =>
{
    if (string.IsNullOrWhiteSpace(options.BootstrapAdminEmail))
        options.BootstrapAdminEmail = builder.Configuration["BOOTSTRAP_ADMIN_EMAIL"] ?? string.Empty;
    if (string.IsNullOrWhiteSpace(options.BootstrapAdminGoogleSubject))
        options.BootstrapAdminGoogleSubject = builder.Configuration["BOOTSTRAP_ADMIN_GOOGLE_SUBJECT"] ?? string.Empty;
});
builder.Services.Configure<FishingOptions>(builder.Configuration.GetSection(FishingOptions.SectionName));
builder.Services.AddDbContext<TaNoMarDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<AuthTokenService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<FishingForecastCache>();
builder.Services.AddHttpClient<OpenMeteoClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("tanomar/2.0");
});
builder.Services.AddTransient<FishingForecastService>();
builder.Services.AddHostedService<FishingForecastWarmupWorker>();
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
builder.Services.AddRateLimiter(options => options.AddPolicy("community", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "anonymous", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })));

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
    var spots = await db.FishingSpots.AsNoTracking().Where(spot => spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved) || spot.OwnerUserId == user.Id).OrderBy(spot => spot.Name).ToListAsync(cancellationToken);
    return Results.Ok(spots.Select(spot => SpotDtoProjection(spot, user, favoriteIds.Contains(spot.Id))).ToList());
}).RequireAuthorization();

api.MapPost("/fishing-spots", async (PersonalSpotRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var currentCount = await db.FishingSpots.CountAsync(spot => spot.OwnerUserId == user.Id, cancellationToken);
    if (currentCount >= plan.MaxPersonalSpots) return Results.Conflict(new { code = "plan_limit", detail = "Seu plano não permite mais pesqueiros pessoais." });
    if (request.Latitude is null || request.Longitude is null || string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { detail = "Nome e coordenadas são obrigatórios." });
    var existingSpots = await db.FishingSpots.AsNoTracking().ToListAsync(cancellationToken);
    if (IsDuplicateSpot(existingSpots, request.Name.Trim(), request.Latitude.Value, request.Longitude.Value))
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um pesqueiro com esse nome ou muito próximo." });
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
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/v1/fishing-spots/{spot.Slug}", SpotDtoProjection(spot, user, false));
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
        return Results.Conflict(new { code = "duplicate_spot", detail = "Já existe um pesqueiro com esse nome ou muito próximo." });
    ApplyPersonalSpot(spot, request);
    await db.SaveChangesAsync(cancellationToken);
    var favorite = await db.FavoriteSpots.AnyAsync(item => item.UserId == user.Id && item.FishingSpotId == spot.Id, cancellationToken);
    return Results.Ok(SpotDtoProjection(spot, user, favorite));
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
    db.FishingSpots.Remove(spot);
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapGet("/admin/fishing-spots/pending", async (ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (actor, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spots = await db.FishingSpots.AsNoTracking().Where(spot => spot.Visibility == "shared" && !spot.IsApproved).OrderBy(spot => spot.CreatedAt).ToListAsync(cancellationToken);
    return Results.Ok(spots.Select(spot => SpotDtoProjection(spot, actor!, false)).ToList());
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots/{id}/approve", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "shared", cancellationToken);
    if (spot is null) return Results.NotFound();
    spot.IsApproved = true;
    if (spot.OwnerUserId is Guid ownerId)
        AddNotification(db, ownerId, "Local publicado", $"“{spot.Name}” agora aparece para a comunidade.");
    await db.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

api.MapPost("/admin/fishing-spots/{id}/reject", async (string id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var (_, failure) = await AdminActorAsync(principal, db, cancellationToken);
    if (failure is not null) return failure;
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == id && item.Visibility == "shared" && !item.IsApproved, cancellationToken);
    if (spot is null) return Results.NotFound();
    spot.Visibility = "private";
    spot.IsApproved = true;
    if (spot.OwnerUserId is Guid ownerId)
        AddNotification(db, ownerId, "Local não publicado", $"“{spot.Name}” permanece só no seu mapa.");
    await db.SaveChangesAsync(cancellationToken);
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

api.MapPut("/admin/users/{id:guid}/plan", async (Guid id, AdminPlanRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
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
        AddNotification(db, target.Id, "Plano atualizado", $"Seu plano agora é {plan.Name}.");
        await db.SaveChangesAsync(cancellationToken);
    }
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor!, options.Value, activeAdmins));
}).RequireAuthorization();

api.MapPut("/admin/users/{id:guid}/active", async (Guid id, AdminActiveRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, Microsoft.Extensions.Options.IOptions<TaNoMarOptions> options, CancellationToken cancellationToken) =>
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
        if (!request.IsActive)
        {
            var tokens = await db.RefreshTokens.Where(item => item.UserId == target.Id && item.RevokedAt == null).ToListAsync(cancellationToken);
            var now = DateTimeOffset.UtcNow;
            foreach (var token in tokens) token.RevokedAt = now;
        }
        else
            AddNotification(db, target.Id, "Conta liberada", "Sua conta voltou a ficar ativa no TáNoMar.");
        await db.SaveChangesAsync(cancellationToken);
    }
    var plan = await db.Plans.SingleAsync(item => item.Code == target.PlanCode, cancellationToken);
    var activeAdmins = await db.Users.CountAsync(item => item.IsActive && item.Role == "Admin", cancellationToken);
    return Results.Ok(AdminUserDto(target, plan, actor, options.Value, activeAdmins));
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

api.MapGet("/forecasts/ranking", async (ClaimsPrincipal principal, TaNoMarDbContext db, FishingForecastService fishing, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    var plan = await db.Plans.SingleAsync(item => item.Code == user.PlanCode, cancellationToken);
    var days = new List<object>();
    for (var day = 0; day < plan.MaxForecastDays; day++)
    {
        var forecast = await fishing.GetAsync(day, cancellationToken);
        days.Add(ForecastDayDto(forecast, plan.Code == "premium"));
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
    return Results.Ok(MarineDto(spot.Slug, targetDate, forecast, fishing.Today()));
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
    var myVotes = await db.CommunityReportVotes.AsNoTracking().Where(vote => vote.UserId == user.Id && reportIds.Contains(vote.ReportId)).ToListAsync(cancellationToken);
    return Results.Ok(rows.Select(item => ReportDto(item.report, item.spot, myVotes.FirstOrDefault(vote => vote.ReportId == item.report.Id)?.Kind, item.report.UserId == user.Id)).ToList());
}).RequireAuthorization();
api.MapPost("/community/reports", async (CommunityReportRequest request, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) =>
{
    var user = await CurrentUserAsync(principal, db, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (!SpotRules.IsValidReportType(request.Type.Trim())) return Results.BadRequest(new { detail = "Tipo de relato inválido." });
    var spot = await db.FishingSpots.SingleOrDefaultAsync(item => item.Slug == request.SpotId, cancellationToken);
    if (spot is null) return Results.NotFound();
    if (!SpotRules.IsCommunityVisible(spot)) return Results.Forbid();
    var type = request.Type.Trim().ToLowerInvariant();
    var report = new CommunityReport { UserId = user.Id, FishingSpotId = spot.Id, Type = type, Comment = request.Comment?.Trim(), ExpiresAt = DateTimeOffset.UtcNow.AddHours(type == "perigo" ? 24 : 12) };
    db.CommunityReports.Add(report);
    var favoriteUserIds = await db.FavoriteSpots.Where(item => item.FishingSpotId == spot.Id && item.UserId != user.Id).Select(item => item.UserId).Distinct().ToListAsync(cancellationToken);
    foreach (var favoriteUserId in favoriteUserIds)
        AddNotification(db, favoriteUserId, "Novo relato", $"Alguém relatou {LabelForReportType(type)} em {spot.Name}.");
    await db.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/v1/community/reports/{report.Id}", ReportDto(report, spot, null, true));
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
api.MapPost("/notifications/{id:guid}/read", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) => { var user = await CurrentUserAsync(principal, db, cancellationToken); if (user is null) return Results.Unauthorized(); var item = await db.Notifications.SingleOrDefaultAsync(notification => notification.Id == id && notification.UserId == user.Id, cancellationToken); if (item is null) return Results.NotFound(); item.ReadAt = DateTimeOffset.UtcNow; await db.SaveChangesAsync(cancellationToken); return Results.NoContent(); }).RequireAuthorization();
api.MapDelete("/notifications/{id:guid}", async (Guid id, ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken) => { var user = await CurrentUserAsync(principal, db, cancellationToken); if (user is null) return Results.Unauthorized(); var item = await db.Notifications.SingleOrDefaultAsync(notification => notification.Id == id && notification.UserId == user.Id, cancellationToken); if (item is null) return Results.NotFound(); item.RemovedAt = DateTimeOffset.UtcNow; await db.SaveChangesAsync(cancellationToken); return Results.NoContent(); }).RequireAuthorization();

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
        preferences = new
        {
            region = preferences?.Region ?? "Florianópolis",
            windUnit = preferences?.WindUnit ?? "kmh",
            forecastNotifications = preferences?.ForecastNotifications ?? true
        }
    };
}
static object SpotDtoProjection(FishingSpot spot, User user, bool favorite = false) => new
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
    isInRanking = spot.Visibility == "official",
    isApproved = spot.IsApproved,
    isOwner = SpotRules.Owns(spot, user)
};
static object ReportDto(CommunityReport report, FishingSpot spot, string? myVote, bool isMine) => new
{
    id = report.Id,
    spotId = spot.Slug,
    spotName = spot.Name,
    type = report.Type,
    comment = report.Comment,
    createdAt = report.CreatedAt,
    expiresAt = report.ExpiresAt,
    confirmations = report.Confirmations,
    contested = report.Contested,
    myVote,
    isMine
};
static string LabelForReportType(string type) => type == "perigo" ? "perigo" : "condição";
static void AddNotification(TaNoMarDbContext db, Guid userId, string title, string body) =>
    db.Notifications.Add(new Notification { UserId = userId, Title = title, Body = body });
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
    return new { spotId, date, waves = Locked(), wavePeriod = Locked(), swell = Locked(), waterTemperature = Locked(), tide = Locked() };
}
static object MarineDto(string spotId, DateOnly date, FishingLocationForecast forecast, DateOnly today)
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
        tide = TideMetric(hours, date, today)
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
static object TideMetric(IReadOnlyList<FishingHourForecast> hours, DateOnly date, DateOnly today)
{
    var points = hours
        .Where(hour => hour.SeaLevelHeightMsl.HasValue)
        .Select(hour => (hour.Time, Height: hour.SeaLevelHeightMsl!.Value))
        .ToList();
    if (points.Count < 3) return new { state = "unavailable" };
    var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).DateTime;
    var referenceTime = date == today ? $"{now.Hour:00}:00" : "12:00";
    var current = points.LastOrDefault(item => string.CompareOrdinal(item.Time, referenceTime) <= 0);
    if (current.Time is null) current = points[0];
    var nextHeight = points.FirstOrDefault(item => string.CompareOrdinal(item.Time, current.Time) > 0);
    var phase = nextHeight.Time is null
        ? "n/d"
        : nextHeight.Height >= current.Height ? "Enchente" : "Vazante";
    var extremes = TideCurve.Extremes(hours);
    var nextExtreme = extremes.FirstOrDefault(item => string.CompareOrdinal(item.Time, referenceTime) > 0)
        ?? extremes.FirstOrDefault();
    var nextLabel = nextExtreme is null
        ? "n/d"
        : $"{(nextExtreme.Type == "preamar" ? "Preamar" : "Baixa-mar")} {nextExtreme.Time} · {nextExtreme.HeightMeters:0.00} m";
    return new
    {
        state = "available",
        value = new
        {
            current = $"{current.Height:0.00} m",
            phase,
            nextExtreme = nextLabel,
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

record GoogleLoginRequest(string Credential);
record PreferencesRequest(string? Region, string? WindUnit, bool? ForecastNotifications);
record FavoriteRequest(string SpotId, bool IsFavorite);
record PersonalSpotRequest(string Name, double? Latitude, double? Longitude, string? Description, string? City, string? State, string? Region, bool Shared, double? SeaOrientationDegrees, string? Profile);
record CommunityReportRequest(string SpotId, string Type, string? Comment);
record AdminPlanRequest(string PlanCode);
record AdminActiveRequest(bool IsActive);
