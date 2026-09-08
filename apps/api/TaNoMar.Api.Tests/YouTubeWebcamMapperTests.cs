using TaNoMar.Api.Webcams;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class YouTubeWebcamMapperTests
{
    [Theory]
    [InlineData("dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=_dpvB3f0xYg", "_dpvB3f0xYg")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    [InlineData("youtube.com/watch?v=dQw4w9WgXcQ&t=12s", "dQw4w9WgXcQ")]
    [InlineData("https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ")]
    public void Extrai_id_de_links_conhecidos(string query, string expected)
    {
        Assert.Equal(expected, YouTubeWebcamMapper.TryParseVideoId(query));
        Assert.True(YouTubeWebcamMapper.LooksLikeYouTubeQuery(query));
    }

    [Fact]
    public void Extrai_canal_por_handle_e_id()
    {
        Assert.Equal("PraiaCampeche", YouTubeWebcamMapper.TryParseChannelHandle("https://www.youtube.com/@PraiaCampeche/live"));
        Assert.Equal("UC1234567890123456789012", YouTubeWebcamMapper.TryParseChannelId("https://www.youtube.com/channel/UC1234567890123456789012/live"));
    }

    [Theory]
    [InlineData("https://example.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("nao e um link")]
    [InlineData("")]
    public void Rejeita_consulta_que_nao_e_youtube(string query)
    {
        Assert.Null(YouTubeWebcamMapper.TryParseVideoId(query));
        Assert.False(YouTubeWebcamMapper.LooksLikeYouTubeQuery(query));
    }

    [Fact]
    public void Aceita_somente_transmissao_ao_vivo_incorporavel()
    {
        const string live = """
            {
              "items": [
                {
                  "id": "dQw4w9WgXcQ",
                  "snippet": {
                    "title": "Campeche ao vivo",
                    "liveBroadcastContent": "live",
                    "thumbnails": { "high": { "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" } }
                  },
                  "status": { "embeddable": true }
                }
              ]
            }
            """;
        const string vod = """
            {
              "items": [
                {
                  "id": "dQw4w9WgXcQ",
                  "snippet": { "title": "Vídeo antigo", "liveBroadcastContent": "none" },
                  "status": { "embeddable": true }
                }
              ]
            }
            """;

        var liveDetails = YouTubeWebcamMapper.ToDetails(YouTubeWebcamMapper.ParseVideoList(live), -27.65, -48.46);
        var vodDetails = YouTubeWebcamMapper.ToDetails(YouTubeWebcamMapper.ParseVideoList(vod), -27.65, -48.46);

        Assert.NotNull(liveDetails);
        Assert.True(liveDetails!.IsUsable);
        Assert.Equal("youtube", liveDetails.Provider);
        Assert.Equal("YouTube", liveDetails.ProviderDisplayName);
        Assert.Equal("https://www.youtube.com/embed/dQw4w9WgXcQ", liveDetails.EmbedUrl);
        Assert.False(vodDetails!.IsUsable);
    }

    [Fact]
    public void Extrai_varias_lives_da_busca_e_do_canal()
    {
        const string search = """
            {
              "items": [
                { "id": { "videoId": "aAYoeHSIeYI" } },
                { "id": { "videoId": "6Z72ptU1NyY" } },
                { "id": { "videoId": "invalido" } }
              ]
            }
            """;
        const string videos = """
            {
              "items": [
                {
                  "id": "aAYoeHSIeYI",
                  "snippet": {
                    "title": "Ponte Hercílio Luz",
                    "channelId": "UCtrwK-DOZGcQo9p1VwIkDZw",
                    "liveBroadcastContent": "live"
                  },
                  "status": { "embeddable": true }
                },
                {
                  "id": "6Z72ptU1NyY",
                  "snippet": {
                    "title": "Mix Florianópolis",
                    "channelId": "UCtrwK-DOZGcQo9p1VwIkDZw",
                    "liveBroadcastContent": "none"
                  },
                  "status": { "embeddable": true }
                }
              ]
            }
            """;

        Assert.Equal(["aAYoeHSIeYI", "6Z72ptU1NyY"], YouTubeWebcamMapper.ParseSearchVideoIds(search));
        Assert.Equal("UCtrwK-DOZGcQo9p1VwIkDZw", YouTubeWebcamMapper.TryNormalizeChannelId("UCtrwK-DOZGcQo9p1VwIkDZw"));
        var parsed = YouTubeWebcamMapper.ParseVideos(videos);
        Assert.Equal(2, parsed.Length);
        Assert.Equal("UCtrwK-DOZGcQo9p1VwIkDZw", parsed[0].Snippet?.ChannelId);
        Assert.True(YouTubeWebcamMapper.ToDetails(parsed[0], -27.65, -48.46)!.IsUsable);
        Assert.False(YouTubeWebcamMapper.ToDetails(parsed[1], -27.65, -48.46)!.IsUsable);
    }
}
