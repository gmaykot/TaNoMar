using TaNoMar.Api.Billing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class BillingOptionsTests
{
    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    [InlineData("aact_prod_abc", "$aact_prod_abc")]
    [InlineData("aact_hmlg_abc", "$aact_hmlg_abc")]
    [InlineData("$aact_prod_abc", "$aact_prod_abc")]
    public void NormalizeApiKey_recoloca_o_prefixo_comido_pelo_compose(string? value, string expected)
    {
        Assert.Equal(expected, BillingOptions.NormalizeApiKey(value));
    }
}
