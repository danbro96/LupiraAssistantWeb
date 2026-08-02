using LupiraAssistantWeb.Auth;
using LupiraAssistantWeb.Endpoints;
using Microsoft.AspNetCore.HttpOverrides;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Yarp.ReverseProxy.Transforms;

var builder = WebApplication.CreateBuilder(args);

// Prod: the mobile app's Authentik JWT bearer. Dev: a local user, forwarded upstream as X-Dev-User.
builder.AddAssistantWebAuth();

builder.Services.AddAppHealthChecks();

// Reverse proxy to the upstream APIs (REST at the upstream root, so the /api/{upstream} prefix is
// stripped; the assistant routes re-announce it via X-Forwarded-Prefix so the hub's OIDC enrollment
// flow builds proxied callback URLs). A caller-presented bearer is forwarded verbatim — YARP copies
// the Authorization header, so the transform stands aside; the upstreams validate the token themselves.
// Dev forwards X-Dev-User instead of a token so the stack runs without Authentik.
var isDev = builder.Environment.IsDevelopment();
var devUser = builder.Configuration["Dev:User"] ?? "dev@localhost";
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(ctx => ctx.AddRequestTransform(transform =>
    {
        var incoming = transform.HttpContext.Request.Headers.Authorization.ToString();
        if (isDev && !incoming.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            transform.ProxyRequest.Headers.TryAddWithoutValidation("X-Dev-User", devUser);
        return ValueTask.CompletedTask;
    }));

// OpenTelemetry → platform collector. Env-gated: a no-op without OTEL_EXPORTER_OTLP_ENDPOINT (local
// dev stays silent). Protocol/headers/interval/resource-attrs come from the standard OTEL_* env vars.
var otlpEndpoint = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
if (!string.IsNullOrWhiteSpace(otlpEndpoint))
{
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(r => r.AddService(
            serviceName: "lupira-assistant-web",
            serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0"))
        .WithTracing(t => t
            .AddAspNetCoreInstrumentation(o =>
            {
                o.RecordException = true;
                // Health probes are polled constantly by docker + devops-monitor; their spans add nothing.
                o.Filter = ctx => ctx.Request.Path != "/livez" && ctx.Request.Path != "/readyz";
            })
            .AddHttpClientInstrumentation()
            .AddOtlpExporter())
        .WithMetrics(m => m
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddOtlpExporter());

    builder.Logging.AddOpenTelemetry(o =>
    {
        o.IncludeFormattedMessage = true;
        o.IncludeScopes = true;
        o.AddOtlpExporter();
    });
}

var app = builder.Build();

// Behind the reverse tunnel: trust X-Forwarded-* so redirects and Secure cookies use https. The tunnel
// reaches us from a Docker-bridge IP, not loopback, so the default KnownProxies/KnownNetworks allowlist
// would drop the headers — clear it. Safe only because the container's sole ingress is the tunnel.
var forwardedHeaders = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
};
forwardedHeaders.KnownIPNetworks.Clear();
forwardedHeaders.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeaders);

if (app.Environment.IsProduction())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.MapAppHealthChecks();

app.UseAuthentication();
app.UseAuthorization();

app.MapReverseProxy();

app.Run();

// Exposes the implicit Program entry point to the integration test assembly (WebApplicationFactory<Program>).
public partial class Program;
