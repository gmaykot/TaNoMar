namespace TaNoMar.Api.Webcams;

internal sealed class WebcamNotConfiguredException : Exception
{
    public WebcamNotConfiguredException()
        : base("A chave da API Windy Webcams não está configurada.")
    {
    }
}

internal sealed class WebcamProviderException : Exception
{
    public WebcamProviderException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}
