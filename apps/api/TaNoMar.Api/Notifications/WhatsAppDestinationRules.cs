namespace TaNoMar.Api.Notifications;

internal static class WhatsAppDestinationRules
{
    public static string? NormalizeType(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        null or "" => null,
        "personal" => "Personal",
        "group" => "Group",
        _ => "Invalid"
    };

    public static bool TryNormalize(
        string? type,
        string? rawId,
        string? rawName,
        out string? destinationType,
        out string? destinationId,
        out string? destinationName,
        out string error)
    {
        destinationType = NormalizeType(type);
        destinationId = NullIfBlank(rawId);
        destinationName = NullIfBlank(rawName);
        error = string.Empty;

        if (destinationType == "Invalid")
        {
            error = "Use personal ou group para o tipo de destino.";
            return false;
        }

        if (destinationType is null)
        {
            if (destinationId is not null || destinationName is not null)
            {
                error = "Informe o destino das notificações.";
                return false;
            }

            return true;
        }

        var groupId = NormalizeGroupId(destinationId);
        var personalId = NormalizePersonalId(destinationId);
        if (groupId is not null)
        {
            destinationType = "Group";
            destinationId = groupId;
        }
        else if (personalId is not null)
        {
            destinationType = "Personal";
            destinationId = personalId;
        }
        else
        {
            error = destinationType == "Group"
                ? "Informe o JID do grupo (…@g.us) ou selecione um grupo da lista."
                : "Informe um número com DDD ou o JID pessoal (…@s.whatsapp.net). JID de grupo termina com @g.us.";
            return false;
        }

        destinationName ??= destinationType == "Personal"
            ? destinationId.Split('@')[0]
            : destinationId;
        return true;
    }

    internal static string? NormalizePersonalId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (trimmed.EndsWith("@lid", StringComparison.Ordinal))
        {
            var lid = trimmed[..^4];
            return lid.Length is >= 10 and <= 20 && lid.All(char.IsDigit) ? trimmed : null;
        }

        if (trimmed.EndsWith("@s.whatsapp.net", StringComparison.Ordinal))
        {
            var user = trimmed[..^"@s.whatsapp.net".Length].Split(':')[0];
            return user.Length is >= 10 and <= 15 && user.All(char.IsDigit)
                ? $"{user}@s.whatsapp.net"
                : null;
        }

        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length is 10 or 11 && !digits.StartsWith("55", StringComparison.Ordinal))
            digits = "55" + digits;
        if (digits.StartsWith("55", StringComparison.Ordinal) && digits.Length > 13)
            digits = digits[..13];
        return digits.Length is 12 or 13 ? $"{digits}@s.whatsapp.net" : null;
    }

    internal static string? NormalizeGroupId(string? value)
    {
        var trimmed = NullIfBlank(value);
        if (trimmed is null || !trimmed.EndsWith("@g.us", StringComparison.Ordinal))
            return null;
        var user = trimmed[..^"@g.us".Length];
        return user.Length is >= 10 and <= 25 && user.All(char.IsDigit) ? trimmed : null;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
