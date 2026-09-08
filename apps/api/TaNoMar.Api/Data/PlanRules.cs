namespace TaNoMar.Api.Data;

internal static class PlanRules
{
    public const string Free = "free";
    public const string Arrais = "arrais";
    public const string Mestre = "premium";
    public const string Capitao = "capitao";
    public const string RequiredPlanLabel = "Assinatura";

    public static bool IsPaid(string? planCode) =>
        !string.IsNullOrWhiteSpace(planCode)
        && !string.Equals(planCode, Free, StringComparison.OrdinalIgnoreCase);

    public static string? NormalizeAssignable(string? planCode)
    {
        var code = planCode?.Trim().ToLowerInvariant();
        if (code is "mestre") return Mestre;
        return code is Free or Arrais or Mestre or Capitao ? code : null;
    }
}
