using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class OpenMeteoClientTests
{
    [Fact]
    public async Task Weather_batch_sends_all_coordinates_in_one_request()
    {
        Uri? requestUri = null;
        using var httpClient = new HttpClient(new StubHandler(request =>
        {
            requestUri = request.RequestUri;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("[{\"hourly\":{}},{\"hourly\":{}}]", Encoding.UTF8, "application/json")
            };
        }));
        var client = new OpenMeteoClient(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new FishingOptions()),
            NullLogger<OpenMeteoClient>.Instance);

        var result = await client.GetWeatherBatchAsync(
            [
                new FishingLocation { Id = "a", Latitude = -27.5, Longitude = -48.5 },
                new FishingLocation { Id = "b", Latitude = -28, Longitude = -49 }
            ],
            "America/Sao_Paulo",
            8,
            CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.NotNull(requestUri);
        var query = Uri.UnescapeDataString(requestUri.Query);
        Assert.Contains("latitude=-27.5,-28", query);
        Assert.Contains("longitude=-48.5,-49", query);
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => Task.FromResult(response(request));
    }
}
