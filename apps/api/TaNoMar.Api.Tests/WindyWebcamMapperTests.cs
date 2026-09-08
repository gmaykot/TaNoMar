using TaNoMar.Api.Webcams;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class WindyWebcamMapperTests
{
    [Fact]
    public void Filtra_cameras_sem_player_ao_vivo()
    {
        const string json = """
            {
              "total": 2,
              "webcams": [
                {
                  "webcamId": 111,
                  "status": "active",
                  "title": "Campeche",
                  "location": { "latitude": -27.654, "longitude": -48.469 },
                  "player": { "live": "https://webcams.windy.com/embed/111/live", "day": "https://webcams.windy.com/embed/111/day" },
                  "images": { "current": { "preview": "https://images.windy.com/preview.jpg" } }
                },
                {
                  "webcamId": 222,
                  "status": "active",
                  "title": "Timelapse",
                  "location": { "latitude": -27.63, "longitude": -48.45 },
                  "player": { "day": "https://webcams.windy.com/embed/222/day" }
                },
                {
                  "webcamId": 333,
                  "status": "inactive",
                  "title": "Inativa",
                  "location": { "latitude": -27.63, "longitude": -48.45 },
                  "player": { "live": "https://webcams.windy.com/embed/333/live" }
                }
              ]
            }
            """;

        var hits = WindyWebcamMapper.ParseList(json)
            .Select(item => WindyWebcamMapper.ToSearchHit(item, -27.65407, -48.46908))
            .Where(item => item is not null)
            .ToList();

        Assert.Single(hits);
        Assert.Equal("111", hits[0]!.ExternalId);
        Assert.True(hits[0]!.IsLive);
        Assert.Equal("https://images.windy.com/preview.jpg", hits[0]!.PreviewUrl);
    }

    [Fact]
    public void Aceita_player_live_no_formato_objeto()
    {
        const string json = """
            {
              "webcamId": "999",
              "status": "active",
              "title": "Joaquina",
              "location": { "latitude": -27.6308, "longitude": -48.4508 },
              "player": { "live": { "available": true, "embed": "https://webcams.windy.com/embed/999/live" } }
            }
            """;

        var details = WindyWebcamMapper.ToDetails(WindyWebcamMapper.ParseOne(json), -27.63, -48.45);

        Assert.NotNull(details);
        Assert.True(details!.IsUsable);
        Assert.Equal("999", details.ExternalId);
        Assert.Equal("https://webcams.windy.com/embed/999/live", details.EmbedUrl);
    }
}

public sealed class WebcamGeoTests
{
    [Fact]
    public void Calcula_distancia_aproximada()
    {
        var km = WebcamGeo.DistanceKm(-27.65407, -48.46908, -27.6308, -48.4508);
        Assert.InRange(km, 2, 4);
    }
}
