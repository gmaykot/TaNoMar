using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace TaNoMar.Api.Data;

public static class PartnerRules
{
    public static readonly string[] Categories = ["loja", "guia", "hospedagem", "outro"];

    public static bool IsCategory(string? value) =>
        value is "loja" or "guia" or "hospedagem" or "outro";

    public static bool HasContact(string? whatsApp, string? instagram, string? website, string? mapsUrl) =>
        !string.IsNullOrWhiteSpace(whatsApp)
        || !string.IsNullOrWhiteSpace(instagram)
        || !string.IsNullOrWhiteSpace(website)
        || !string.IsNullOrWhiteSpace(mapsUrl);

    public static string? TrimToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    public static string? DigitsOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var digits = Regex.Replace(value, @"\D", "");
        return digits.Length == 0 ? null : digits;
    }

    public static IEnumerable<PartnerOffer> VisibleOffers(IEnumerable<PartnerOffer> offers, DateTimeOffset now) =>
        offers
            .Where(offer => offer.EndsAt is null || offer.EndsAt > now)
            .OrderBy(offer => offer.SortOrder)
            .ThenBy(offer => offer.Title);

    public static string Slugify(string name)
    {
        var normalized = name.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(character)) builder.Append(character);
            else if (character is ' ' or '-' or '_') builder.Append('-');
        }

        var slug = Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), "-{2,}", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "parceiro" : slug;
    }
}
