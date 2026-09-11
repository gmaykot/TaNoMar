using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Notifications;

internal static class WhatsAppEndpoints
{
    public static void Map(RouteGroupBuilder api)
    {
        api.MapGet("/admin/integrations/whatsapp", async (
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WhatsAppAdminService service,
            CancellationToken cancellationToken) =>
        {
            var failure = await AuthorizeAsync(principal, db, cancellationToken);
            return failure ?? Results.Ok(await service.GetAsync(cancellationToken));
        }).RequireAuthorization();

        api.MapPut("/admin/integrations/whatsapp", async (
            WhatsAppSettingsRequest request,
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WhatsAppAdminService service,
            CancellationToken cancellationToken) =>
        {
            var failure = await AuthorizeAsync(principal, db, cancellationToken);
            return failure ?? await service.UpdateAsync(request, cancellationToken);
        }).RequireAuthorization();

        api.MapGet("/admin/integrations/whatsapp/destinations", async (
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WhatsAppAdminService service,
            CancellationToken cancellationToken) =>
        {
            var failure = await AuthorizeAsync(principal, db, cancellationToken);
            return failure ?? await service.GetDestinationsAsync(cancellationToken);
        }).RequireAuthorization();

        api.MapGet("/admin/integrations/whatsapp/qr", async (
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WhatsAppAdminService service,
            CancellationToken cancellationToken) =>
        {
            var failure = await AuthorizeAsync(principal, db, cancellationToken);
            return failure ?? await service.GetQrAsync(cancellationToken);
        }).RequireAuthorization();

        MapAction(api, "connect", (service, token) => service.ConnectAsync(token));
        MapAction(api, "reconnect", (service, token) => service.ReconnectAsync(token));
        MapAction(api, "disconnect", (service, token) => service.DisconnectAsync(token));
        MapAction(api, "test", (service, token) => service.SendTestAsync(token));
    }

    private static void MapAction(
        RouteGroupBuilder api,
        string action,
        Func<WhatsAppAdminService, CancellationToken, Task<IResult>> execute) =>
        api.MapPost($"/admin/integrations/whatsapp/{action}", async (
            ClaimsPrincipal principal,
            TaNoMarDbContext db,
            WhatsAppAdminService service,
            CancellationToken cancellationToken) =>
        {
            var failure = await AuthorizeAsync(principal, db, cancellationToken);
            return failure ?? await execute(service, cancellationToken);
        }).RequireAuthorization();

    private static async Task<IResult?> AuthorizeAsync(
        ClaimsPrincipal principal,
        TaNoMarDbContext db,
        CancellationToken cancellationToken)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(id, out var userId)) return Results.Unauthorized();
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null) return Results.Unauthorized();
        return SpotRules.IsAdmin(user) ? null : Results.Forbid();
    }
}
