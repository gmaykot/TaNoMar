using TaNoMar.Api.Notifications;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class WhatsAppDestinationRulesTests
{
    [Theory]
    [InlineData("48999999999", "5548999999999@s.whatsapp.net")]
    [InlineData("5548999999999", "5548999999999@s.whatsapp.net")]
    [InlineData("55489997710622", "5548999771062@s.whatsapp.net")]
    [InlineData("5548999999999@s.whatsapp.net", "5548999999999@s.whatsapp.net")]
    [InlineData("123456789012345@lid", "123456789012345@lid")]
    [InlineData("(48) 99999-9999", "5548999999999@s.whatsapp.net")]
    public void NormalizePersonalId_aceita_numero_com_ou_sem_jid(string input, string expected)
    {
        Assert.Equal(expected, WhatsAppDestinationRules.NormalizePersonalId(input));
    }

    [Theory]
    [InlineData("")]
    [InlineData("999")]
    [InlineData("grupo@g.us")]
    public void NormalizePersonalId_recusa_valor_invalido(string input)
    {
        Assert.Null(WhatsAppDestinationRules.NormalizePersonalId(input));
    }

    [Fact]
    public void TryNormalize_converte_numero_pessoal_e_preenche_o_nome()
    {
        Assert.True(WhatsAppDestinationRules.TryNormalize(
            "personal",
            "48999999999",
            null,
            out var type,
            out var id,
            out var name,
            out var error));

        Assert.Equal("Personal", type);
        Assert.Equal("5548999999999@s.whatsapp.net", id);
        Assert.Equal("5548999999999", name);
        Assert.Equal(string.Empty, error);
    }

    [Fact]
    public void TryNormalize_trata_jid_de_grupo_mesmo_com_tipo_pessoal()
    {
        Assert.True(WhatsAppDestinationRules.TryNormalize(
            "personal",
            "120363001234567890@g.us",
            null,
            out var type,
            out var id,
            out var name,
            out var error));

        Assert.Equal("Group", type);
        Assert.Equal("120363001234567890@g.us", id);
        Assert.Equal("120363001234567890@g.us", name);
        Assert.Equal(string.Empty, error);
    }
}
