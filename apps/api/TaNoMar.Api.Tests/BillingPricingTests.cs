using TaNoMar.Api.Billing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class BillingPricingTests
{
    [Theory]
    [InlineData("CONFIRMED", true)]
    [InlineData("RECEIVED", true)]
    [InlineData("PENDING", false)]
    [InlineData("CREATED", false)]
    [InlineData(null, false)]
    [InlineData("", false)]
    public void IsConfirmedPaymentStatus_libera_so_cobranca_paga(string? status, bool expected)
    {
        Assert.Equal(expected, BillingPricing.IsConfirmedPaymentStatus(status));
    }

    [Theory]
    [InlineData(0, 3)]
    [InlineData(12, 3)]
    [InlineData(24, 2)]
    [InlineData(48, 1)]
    [InlineData(71, 1)]
    [InlineData(72, 0)]
    public void PastDueDaysRemaining_conta_a_carencia(int hoursElapsed, int expected)
    {
        var start = new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero);
        Assert.Equal(expected, BillingPricing.PastDueDaysRemaining(start, start.AddHours(hoursElapsed)));
    }

    [Theory]
    [InlineData(3, "A renovação da assinatura está atrasada. Atualize o pagamento em até 3 dias para manter o plano.")]
    [InlineData(2, "A renovação da assinatura está atrasada. Atualize o pagamento em até 2 dias para manter o plano.")]
    [InlineData(1, "A renovação da assinatura está atrasada. Atualize o pagamento hoje para manter o plano.")]
    [InlineData(0, "A renovação da assinatura está atrasada. Atualize o pagamento hoje para manter o plano.")]
    public void PastDueReminderBody_avisa_os_dias_restantes(int remaining, string expected)
    {
        Assert.Equal(expected, BillingPricing.PastDueReminderBody(remaining));
    }

    [Fact]
    public void StartOfLocalDay_usa_o_calendario_do_fuso()
    {
        var zone = TimeZoneInfo.CreateCustomTimeZone("test", TimeSpan.FromHours(-3), "test", "test");
        var now = new DateTimeOffset(2026, 9, 11, 2, 0, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 9, 10, 3, 0, 0, TimeSpan.Zero), BillingPricing.StartOfLocalDay(now, zone));
    }
}
