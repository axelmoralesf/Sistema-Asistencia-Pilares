using AsistenciaAPI.Infrastructure;
using AsistenciaAPI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using AsistenciaAPI.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AsistenciaAPI.API; // HostingExtensions.ApplyMigrationsAndSeed()
using AsistenciaAPI.Application;
using AsistenciaAPI.Application.Common.Interfaces;
using AsistenciaAPI.Application.DTOs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// Register MVC controllers
builder.Services.AddControllers();

// *** CONFIGURAR CORS PARA PERMITIR PETICIONES DEL FRONTEND ***
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",      // React por defecto
                "http://localhost:3001",      // Por si usas otro puerto
                "https://localhost:3000"
            )
            .AllowAnyMethod()                 // GET, POST, PUT, DELETE, etc.
            .AllowAnyHeader()                 // Content-Type, Authorization, etc.
            .AllowCredentials();              // Permite cookies/auth
    });
});

// Configure JWT authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? string.Empty;
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// Registrar dependencias de Infrastructure (DbContext, etc.)
builder.Services.AddInfrastructure(builder.Configuration);
// Registrar capa de Application (servicios, AutoMapper, etc.)
builder.Services.AddApplication();

var app = builder.Build();

// Aplicar migraciones/seed a través del servicio registrado (extraído para ser testeable)
app = app.ApplyMigrationsAndSeed();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// *** ACTIVAR CORS ANTES DE OTROS MIDDLEWARES ***
app.UseCors("AllowFrontend");

// Servir archivos estáticos del frontend React (wwwroot)
app.UseStaticFiles();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithOpenApi();

// Endpoint pequeño para verificar la salud y conteos de tablas
app.MapGet("/health/db", async (AsistenciaDbContext db) =>
{
    var areas = await db.Areas.CountAsync();
    var roles = await db.Roles.CountAsync();
    var empleados = await db.Empleados.CountAsync();
    var registros = await db.RegistrosAsistencia.CountAsync();

    return Results.Ok(new { ok = true, areas, roles, empleados, registros });
})
.WithName("DbHealth")
.WithOpenApi();

// Use controllers for empleados, asistencia and reportes
app.MapControllers();

// Fallback SPA: servir index.html para rutas de frontend
app.MapFallbackToFile("/index.html");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
