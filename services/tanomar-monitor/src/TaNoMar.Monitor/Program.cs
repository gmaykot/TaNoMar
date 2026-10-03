using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Monitor.Checks;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Monitoring;
using TaNoMar.Monitor.Notifications;
using TaNoMar.Monitor.Persistence;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

builder.Services.AddOptions<MonitoringOptions>()
    .Bind(configuration.GetSection("Monitoring"))
    .PostConfigure(options =>
    {
        options.WebUrl = configuration["TANOMAR_WEB_URL"] ?? options.WebUrl;
        options.WebExpectedContent = configuration["TANOMAR_WEB_EXPECTED_CONTENT"] ?? options.WebExpectedContent;
        options.ApiUrl = configuration["TANOMAR_API_URL"] ?? options.ApiUrl;
        options.DatabasePath = configuration["MONITOR_DATABASE_PATH"] ?? options.DatabasePath;
    })
    .ValidateOnStart();
builder.Services.AddOptions<WhatsAppOptions>()
    .Bind(configuration.GetSection("WhatsApp"))
    .PostConfigure(options =>
    {
        options.BaseUrl = configuration["WHATSAPP_BASE_URL"] ?? options.BaseUrl;
        options.ApiKey = configuration["WHATSAPP_API_KEY"] ?? options.ApiKey;
        options.DestinationId = configuration["WHATSAPP_DESTINATION_ID"] ?? options.DestinationId;
    })
    .ValidateOnStart();
builder.Services.AddOptions<AlertOptions>()
    .Bind(configuration.GetSection("Alerts"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<MonitoringOptions>, MonitoringOptionsValidator>();
builder.Services.AddSingleton<IValidateOptions<WhatsAppOptions>, WhatsAppOptionsValidator>();
builder.Services.AddSingleton<IValidateOptions<AlertOptions>, AlertOptionsValidator>();
builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<MonitoringOptions>>().Value);
builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<WhatsAppOptions>>().Value);
builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<AlertOptions>>().Value);

builder.Services.AddDbContextFactory<MonitorDbContext>((sp, db) =>
    db.UseSqlite($"Data Source={sp.GetRequiredService<MonitoringOptions>().DatabasePath}"));
builder.Services.AddHttpClient("checks", (sp, client) =>
    client.Timeout = TimeSpan.FromSeconds(sp.GetRequiredService<MonitoringOptions>().HttpTimeoutSeconds));
builder.Services.AddHttpClient("whatsapp-status", (sp, client) =>
{
    var options = sp.GetRequiredService<WhatsAppOptions>();
    client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(options.StatusTimeoutSeconds);
});
builder.Services.AddHttpClient("whatsapp-send", (sp, client) =>
{
    var options = sp.GetRequiredService<WhatsAppOptions>();
    client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(options.SendTimeoutSeconds);
});
builder.Services.AddSingleton<IAlertSender>(sp => new WhatsAppAlertSender(
    sp.GetRequiredService<IHttpClientFactory>().CreateClient("whatsapp-status"),
    sp.GetRequiredService<IHttpClientFactory>().CreateClient("whatsapp-send"),
    sp.GetRequiredService<WhatsAppOptions>(),
    sp.GetRequiredService<ILogger<WhatsAppAlertSender>>()));
builder.Services.AddSingleton<IMonitorCheck>(sp =>
{
    var options = sp.GetRequiredService<MonitoringOptions>();
    return new HttpMonitorCheck("TaNoMar Web", options.WebUrl, options.WebExpectedContent, sp.GetRequiredService<IHttpClientFactory>().CreateClient("checks"));
});
builder.Services.AddSingleton<IMonitorCheck>(sp =>
{
    var options = sp.GetRequiredService<MonitoringOptions>();
    return new HttpMonitorCheck("TaNoMar API", options.ApiUrl, null, sp.GetRequiredService<IHttpClientFactory>().CreateClient("checks"));
});
builder.Services.AddSingleton<MonitorCoordinator>();
builder.Services.AddSingleton<MonitorWorker>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<MonitorWorker>());

var app = builder.Build();
var monitoringOptions = app.Services.GetRequiredService<MonitoringOptions>();
Directory.CreateDirectory(Path.GetDirectoryName(monitoringOptions.DatabasePath) ?? ".");
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<MonitorDbContext>().Database.EnsureCreatedAsync();

app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", async (MonitorDbContext db, MonitorWorker worker, CancellationToken cancellationToken) =>
{
    try
    {
        var databaseReady = await db.Database.CanConnectAsync(cancellationToken);
        return databaseReady && worker.IsOperational ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503);
    }
    catch (Exception exception) when (exception is InvalidOperationException or System.Data.Common.DbException or TimeoutException)
    {
        return Results.StatusCode(503);
    }
});
app.MapGet("/status", async (MonitorCoordinator coordinator, CancellationToken cancellationToken) =>
{
    var checks = await coordinator.GetStatesAsync(cancellationToken);
    var status = checks.Any(x => x.Status == CheckStatus.Down) ? "degraded" : checks.Count > 0 && checks.All(x => x.Status == CheckStatus.Healthy) ? "healthy" : "unknown";
    var publicChecks = checks.Select(x => new
    {
        x.Name,
        status = x.Status.ToString(),
        x.LastCheckAt,
        x.LastSuccessAt,
        x.LastFailureAt,
        x.OutageStartedAt,
        x.LastLatencyMs,
        x.ConsecutiveFailures,
        x.ConsecutiveSuccesses,
        x.LastError
    });
    return Results.Ok(new { status, checks = publicChecks });
});
await app.RunAsync();

public partial class Program { }
