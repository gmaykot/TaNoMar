using Microsoft.Extensions.Options;

namespace TaNoMar.Monitor.Configuration;

public sealed class MonitoringOptionsValidator : IValidateOptions<MonitoringOptions>
{
    public ValidateOptionsResult Validate(string? name, MonitoringOptions options)
    {
        try { options.Validate(); return ValidateOptionsResult.Success; }
        catch (InvalidOperationException exception) { return ValidateOptionsResult.Fail(exception.Message); }
    }
}

public sealed class WhatsAppOptionsValidator : IValidateOptions<WhatsAppOptions>
{
    public ValidateOptionsResult Validate(string? name, WhatsAppOptions options)
    {
        try { options.Validate(); return ValidateOptionsResult.Success; }
        catch (InvalidOperationException exception) { return ValidateOptionsResult.Fail(exception.Message); }
    }
}

public sealed class AlertOptionsValidator : IValidateOptions<AlertOptions>
{
    public ValidateOptionsResult Validate(string? name, AlertOptions options)
    {
        try { options.Validate(); return ValidateOptionsResult.Success; }
        catch (InvalidOperationException exception) { return ValidateOptionsResult.Fail(exception.Message); }
    }
}
