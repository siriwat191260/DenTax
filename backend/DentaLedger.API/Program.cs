using System.Text;
using DentaLedger.API.Data;
using DentaLedger.API.Middleware;
using DentaLedger.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var config  = builder.Configuration;

// ── Database ──────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(config.GetConnectionString("DefaultConnection")));

// ── Auth (Supabase JWT — JWKS / asymmetric keys) ───────────────
var supabaseUrl = config["Supabase:Url"]!.TrimEnd('/');

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        // Supabase's new projects sign JWTs with rotating asymmetric keys (JWKS).
        // Authority + MetadataAddress let the JWT middleware fetch the public
        // signing keys automatically instead of using a static secret.
        opt.Authority        = $"{supabaseUrl}/auth/v1";
        opt.MetadataAddress  = $"{supabaseUrl}/auth/v1/.well-known/openid-configuration";
        opt.RequireHttpsMetadata = true;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer   = true,
            ValidIssuer      = $"{supabaseUrl}/auth/v1",
            ValidateAudience = true,
            ValidAudience    = config["Jwt:Audience"] ?? "authenticated",
            ClockSkew        = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

// ── Services ──────────────────────────────────────────────────
builder.Services.AddHttpClient<IGeminiService, GeminiService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<ITaxService, TaxService>();

// ── API ───────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DentaLedger API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In   = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ── Migrate DB on startup ─────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// ── Middleware pipeline ───────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();