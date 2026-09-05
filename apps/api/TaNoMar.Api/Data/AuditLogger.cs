using System.Text.Json;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Options;

namespace TaNoMar.Api.Data;

public sealed class AuditLogger
{
    private readonly string _file;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public AuditLogger(IOptions<TaNoMarOptions> options) => _file = options.Value.AuditFile;

    public async Task WriteAsync(object entry, CancellationToken ct = default)
    {
        var dir = Path.GetDirectoryName(_file);
        if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
        var line = JsonSerializer.Serialize(entry) + Environment.NewLine;
        await _gate.WaitAsync(ct);
        try { await File.AppendAllTextAsync(_file, line, ct); }
        finally { _gate.Release(); }
    }
}
