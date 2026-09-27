using System.Net;
using System.Text;
using System.Text.Json;
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

    [Fact]
    public async Task Marine_request_keeps_existing_variables_and_adds_ocean_current_variables()
    {
        Uri? requestUri = null;
        using var httpClient = new HttpClient(new StubHandler(request =>
        {
            requestUri = request.RequestUri;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"hourly\":{}}", Encoding.UTF8, "application/json")
            };
        }));
        var client = new OpenMeteoClient(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new FishingOptions()),
            NullLogger<OpenMeteoClient>.Instance);

        await client.GetMarineAsync(
            new FishingLocation { Id = "a", Latitude = -27.5, Longitude = -48.5 },
            "America/Sao_Paulo",
            8,
            CancellationToken.None);

        Assert.NotNull(requestUri);
        var query = Uri.UnescapeDataString(requestUri.Query);
        Assert.Contains("wave_height", query);
        Assert.Contains("swell_wave_period", query);
        Assert.Contains("sea_surface_temperature", query);
        Assert.Contains("sea_level_height_msl", query);
        Assert.Contains("ocean_current_velocity", query);
        Assert.Contains("ocean_current_direction", query);
    }

    [Fact]
    public void Marine_payload_preserves_current_values_and_nullability()
    {
        var response = JsonSerializer.Deserialize<OpenMeteoResponse>(
            "{\"hourly\":{\"time\":[\"2026-09-08T05:00\",\"2026-09-08T06:00\"],\"ocean_current_velocity\":[1.25,null],\"ocean_current_direction\":[225,null]}}")!;

        Assert.Equal(1.25, response.Hourly.OceanCurrentVelocity[0]);
        Assert.Equal(225, response.Hourly.OceanCurrentDirection[0]);
        Assert.Null(response.Hourly.OceanCurrentVelocity[1]);
        Assert.Null(response.Hourly.OceanCurrentDirection[1]);

        var absent = JsonSerializer.Deserialize<OpenMeteoResponse>("{\"hourly\":{}}")!;
        Assert.Empty(absent.Hourly.OceanCurrentVelocity);
        Assert.Empty(absent.Hourly.OceanCurrentDirection);
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => Task.FromResult(response(request));
    }
}
