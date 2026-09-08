namespace TaNoMar.Api.Webcams;

internal sealed class WebcamNotConfiguredException : Exception
{
    public WebcamNotConfiguredException()
        : base("O provedor de câmeras ao vivo não está configurado.")
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
