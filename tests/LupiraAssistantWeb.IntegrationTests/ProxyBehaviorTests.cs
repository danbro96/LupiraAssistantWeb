using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace LupiraAssistantWeb.IntegrationTests;

public sealed class ProxyBehaviorTests(BffTestFactory factory) : IClassFixture<BffTestFactory>
{
    private HttpClient Client() => factory.CreateClient();

    private static AuthenticationHeaderValue Bearer(string token) => new("Bearer", token);

    [Fact]
    public async Task Member_route_without_token_is_401()
    {
        var res = await Client().GetAsync("/api/assistant/me/profile");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Member_route_with_wrong_audience_is_401()
    {
        var client = Client();
        client.DefaultRequestHeaders.Authorization = Bearer(BffTestFactory.MintToken(audience: "some-other-api"));
        var res = await client.GetAsync("/api/assistant/me/profile");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Assistant_route_strips_prefix_and_forwards_bearer_verbatim()
    {
        var token = BffTestFactory.MintToken();
        var client = Client();
        client.DefaultRequestHeaders.Authorization = Bearer(token);

        var echo = await client.GetFromJsonAsync<UpstreamEcho>("/api/assistant/me/profile");

        Assert.NotNull(echo);
        Assert.Equal("/me/profile", echo.Path);
        Assert.Equal($"Bearer {token}", echo.Authorization);
        Assert.Equal("/api/assistant", echo.XForwardedPrefix);
        Assert.Equal("", echo.XDevUser);   // production never invents a dev identity
    }

    [Fact]
    public async Task Comms_route_strips_its_own_prefix()
    {
        var client = Client();
        client.DefaultRequestHeaders.Authorization = Bearer(BffTestFactory.MintToken());

        var echo = await client.GetFromJsonAsync<UpstreamEcho>("/api/comms/topics?status=released");

        Assert.NotNull(echo);
        Assert.Equal("/topics", echo.Path);
    }

    [Fact]
    public async Task Auth_route_is_anonymous_and_carries_the_prefix()
    {
        var echo = await Client().GetFromJsonAsync<UpstreamEcho>("/api/assistant/auth/login?return_uri=x");

        Assert.NotNull(echo);
        Assert.Equal("/auth/login", echo.Path);
        Assert.Equal("/api/assistant", echo.XForwardedPrefix);
        Assert.Equal("", echo.Authorization);
    }
}
