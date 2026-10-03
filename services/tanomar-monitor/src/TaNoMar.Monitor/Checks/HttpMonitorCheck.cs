using System.Diagnostics;
using System.Net;
using TaNoMar.Monitor.Monitoring;

namespace TaNoMar.Monitor.Checks;

public sealed class HttpMonitorCheck(string name, string url, string? expectedContent, HttpClient client) : IMonitorCheck
{
    public string Name { get; } = name;
    public string Url { get; } = url;
    public async Task<CheckResult> ExecuteAsync(CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var response = await client.GetAsync(Url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            var body = await ReadBodyAsync(response, cancellationToken);
            stopwatch.Stop();
            if (body is null) return CheckResult.Failed("Resposta excede o limite de 1 MB", stopwatch.ElapsedMilliseconds);
            if (!response.IsSuccessStatusCode)
                return CheckResult.Failed($"HTTP {(int)response.StatusCode} ({response.StatusCode})", stopwatch.ElapsedMilliseconds);
            if (!string.IsNullOrWhiteSpace(expectedContent) && !body.Contains(expectedContent, StringComparison.OrdinalIgnoreCase))
                return CheckResult.Failed("Conteúdo esperado não encontrado", stopwatch.ElapsedMilliseconds);
            return CheckResult.Ok(stopwatch.ElapsedMilliseconds);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return CheckResult.Failed("Timeout", stopwatch.ElapsedMilliseconds);
        }
        catch (HttpRequestException exception)
        {
            return CheckResult.Failed(Summarize(exception.Message), stopwatch.ElapsedMilliseconds);
        }
        catch (Exception exception)
        {
            return CheckResult.Failed(Summarize(exception.Message), stopwatch.ElapsedMilliseconds);
        }
    }

    private static string Summarize(string value) => value.Length <= 240 ? value : value[..240];

    private static async Task<string?> ReadBodyAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        const int maxBodyBytes = 1_048_576;
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var body = new MemoryStream();
        var buffer = new byte[8192];
        while (true)
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);
            if (read == 0) break;
            if (body.Length + read > maxBodyBytes) return null;
            body.Write(buffer, 0, read);
        }
        return System.Text.Encoding.UTF8.GetString(body.ToArray());
    }
}
