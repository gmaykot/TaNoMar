using Cronos;
using TaNoMar.Api.Fishing;

namespace TaNoMar.Api.Workers;

internal enum WorkerKind
{
    Scheduled,
    Queue
}

internal sealed record WorkerDefinition(
    string Key,
    string Name,
    WorkerKind Kind,
    string? DefaultCronExpression,
    string Description,
    string UsedBy,
    string DataSource);

internal static class WorkerCatalog
{
    public const string ForecastRefresh = "forecast-refresh";
    public const string TideEnrichment = "tide-enrichment";
    public const string ForecastWarmup = "forecast-warmup";
    public const string ForecastAlerts = "forecast-alerts";
    public const string BillingPeriods = "billing-periods";
    public const string WebPushDispatch = "web-push-dispatch";

    public static readonly IReadOnlyList<WorkerDefinition> All =
    [
        new(
            ForecastRefresh,
            "Atualização de previsões",
            WorkerKind.Queue,
            null,
            "Processa em lote os locais que precisam de uma previsão nova ou atualizada.",
            "Home, ranking e detalhe do local.",
            "Fila interna; consulta Weather, GFS e Marine da Open-Meteo e grava snapshots no PostgreSQL."),
        new(
            TideEnrichment,
            "Enriquecimento de maré",
            WorkerKind.Queue,
            null,
            "Completa a previsão já processada com os pontos e extremos de maré.",
            "Detalhe do local e indicadores de maré.",
            "Fila interna; consulta a Tábua de Maré API e usa o nível modelado da Open-Meteo como fallback."),
        new(
            ForecastWarmup,
            "Aquecimento de previsões",
            WorkerKind.Scheduled,
            "0 */3 * * *",
            "Enfileira periodicamente os locais públicos para manter as previsões aquecidas.",
            "Disponibilidade antecipada da Home, ranking e detalhes.",
            "Locais oficiais ativos e compartilhados aprovados no PostgreSQL; o processamento segue pela fila de previsões."),
        new(
            ForecastAlerts,
            "Alertas de previsão",
            WorkerKind.Scheduled,
            "0 * * * *",
            "Verifica os alertas ativos e cria uma notificação quando a nota mínima é alcançada.",
            "Caixa de notificações, atualização em tempo real e Web Push.",
            "Alertas, usuários, planos e preferências no PostgreSQL, além da previsão armazenada."),
        new(
            BillingPeriods,
            "Períodos de assinatura",
            WorkerKind.Scheduled,
            "0 * * * *",
            "Atualiza acessos vencidos e sincroniza os preços futuros das assinaturas.",
            "Planos e acesso às funcionalidades pagas.",
            "Usuários, assinaturas e planos no PostgreSQL; sincronização do catálogo com o Asaas."),
        new(
            WebPushDispatch,
            "Envio Web Push",
            WorkerKind.Queue,
            null,
            "Entrega aos aparelhos as notificações que foram colocadas na fila de envio.",
            "Avisos de comunidade, conta, plano e alertas de previsão.",
            "Fila interna e inscrições Push no PostgreSQL; envia para o endpoint Web Push de cada aparelho."),
    ];

    public static WorkerDefinition? Find(string key) =>
        All.SingleOrDefault(item => string.Equals(item.Key, key, StringComparison.Ordinal));

    public static bool TryNormalizeCron(string? value, out string normalized)
    {
        normalized = string.Join(' ', (value ?? string.Empty)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length != 5)
            return false;

        try
        {
            CronExpression.Parse(normalized);
            return true;
        }
        catch (CronFormatException)
        {
            return false;
        }
    }

    public static string WarmupDefaultCron(FishingOptions options)
    {
        var intervalHours = options.WarmupIntervalHours > 0
            ? options.WarmupIntervalHours
            : Math.Max(1, options.CacheHours / 2);
        return intervalHours switch
        {
            1 => "0 * * * *",
            >= 2 and <= 23 => $"0 */{intervalHours} * * *",
            24 => "0 0 * * *",
            _ => Find(ForecastWarmup)!.DefaultCronExpression!
        };
    }
}
