using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Webcams;

internal static class WebcamEndpoints
{
    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/fishing-spots/{id}/webcam", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.ViewAsync(user, id, cancellationToken)).ToResult();
        }).RequireAuthorization();

        api.MapGet("/fishing-spots/{id}/webcams/search", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.SearchAsync(user, id, asAdmin: false, cancellationToken)).ToResult();
        }).RequireAuthorization().RequireRateLimiting("webcams");

        api.MapPost("/fishing-spots/{id}/webcam", async (
            string id,
            WebcamLinkRequest request,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.LinkAsync(user, id, request, asAdmin: false, cancellationToken)).ToResult();
        }).RequireAuthorization().RequireRateLimiting("webcams");

        api.MapDelete("/fishing-spots/{id}/webcam", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.UnlinkAsync(user, id, asAdmin: false, cancellationToken)).ToResult();
        }).RequireAuthorization();

        api.MapGet("/admin/fishing-spots/{id}/webcam", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.GetLinkedAsync(user, id, asAdmin: true, cancellationToken)).ToResult();
        }).RequireAuthorization();

        api.MapGet("/admin/fishing-spots/{id}/webcams/search", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.SearchAsync(user, id, asAdmin: true, cancellationToken)).ToResult();
        }).RequireAuthorization().RequireRateLimiting("webcams");

        api.MapPost("/admin/fishing-spots/{id}/webcam", async (
            string id,
            WebcamLinkRequest request,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.LinkAsync(user, id, request, asAdmin: true, cancellationToken)).ToResult();
        }).RequireAuthorization().RequireRateLimiting("webcams");

        api.MapDelete("/admin/fishing-spots/{id}/webcam", async (
            string id,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WebcamService webcams,
            CancellationToken cancellationToken) =>
        {
            var user = await CurrentUserAsync(principal, db, cancellationToken);
            if (user is null) return Results.Unauthorized();
            return (await webcams.UnlinkAsync(user, id, asAdmin: true, cancellationToken)).ToResult();
        }).RequireAuthorization();
    }

    private static Task<User?> CurrentUserAsync(ClaimsPrincipal principal, TaNoMarDbContext db, CancellationToken cancellationToken)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(id, out var userId)
            ? db.Users.SingleOrDefaultAsync(user => user.Id == userId, cancellationToken)
            : Task.FromResult<User?>(null);
    }
}
