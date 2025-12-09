using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using AsistenciaAPI.Infrastructure.Persistence;
using System.IO;
using Microsoft.Data.Sqlite;

namespace AsistenciaAPI.Infrastructure
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            var rawConnectionString = configuration.GetConnectionString("DefaultConnection");
            var connectionString = NormalizeConnectionString(rawConnectionString);

            // Si la cadena de conexión contiene DataSource= (con o sin espacio), asumimos SQLite.
            // En caso contrario, usamos SQL Server.
            if (!string.IsNullOrEmpty(connectionString) &&
                (connectionString.Contains("DataSource=", StringComparison.OrdinalIgnoreCase) ||
                 connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase)))
            {
                services.AddDbContext<AsistenciaDbContext>(options =>
                {
                    options.UseSqlite(connectionString);
                    // Suprimir advertencia de migraciones pendientes
                    options.ConfigureWarnings(w =>
                        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
                });
            }
            else if (!string.IsNullOrEmpty(rawConnectionString) && rawConnectionString.Contains("%LOCALAPPDATA%"))
            {
                // Si la cadena original contiene %LOCALAPPDATA% pero no fue procesada, procesarla aquí
                var fallbackConnection = NormalizeConnectionString(rawConnectionString);
                services.AddDbContext<AsistenciaDbContext>(options =>
                {
                    options.UseSqlite(fallbackConnection);
                    options.ConfigureWarnings(w =>
                        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
                });
            }
            else
            {
                services.AddDbContext<AsistenciaDbContext>(options =>
                {
                    options.UseSqlServer(connectionString);
                    // Suprimir advertencia de migraciones pendientes
                    options.ConfigureWarnings(w =>
                        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
                });
            }

            // Registrar servicio que aplica migraciones y realiza seed; es testeable e inyectable.
            services.AddScoped<Services.IMigrationService, Services.MigrationService>();

            // Registrar ISeeder (implementación DbSeeder) para permitir mocking en tests
            services.AddScoped<Services.ISeeder, Persistence.DbSeeder>();

            // Registrar la abstracción IApplicationDbContext para que la capa Application dependa de la interfaz
            services.AddScoped<Application.Common.Interfaces.IApplicationDbContext>(provider => provider.GetRequiredService<AsistenciaDbContext>());

            // Registrar el servicio de asistencias (Application layer)
            services.AddScoped<Application.Common.Interfaces.IAsistenciaService, AsistenciaAPI.Application.Services.AsistenciaService>();

            // Registrar el servicio de reportes (implementación en Infrastructure que usa ClosedXML)
            services.AddScoped<Application.Common.Interfaces.IReporteService, Services.ReporteService>();

            // Registrar password hasher (implementación en Infrastructure)
            services.AddSingleton<Application.Common.Interfaces.IPasswordHasher, Services.PasswordHasher>();

            return services;
        }

        private static string NormalizeConnectionString(string? connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                // Por defecto, usar SQLite en AppData
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var dbPath = Path.Combine(appData, "AsistenciaPilares", "data.db");
                var dir = Path.GetDirectoryName(dbPath);
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                return $"Data Source={dbPath};Cache=Shared";
            }

            // Si contiene %LOCALAPPDATA%, expandir
            if (connectionString.Contains("%LOCALAPPDATA%", StringComparison.OrdinalIgnoreCase))
            {
                var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var expanded = connectionString.Replace("%LOCALAPPDATA%", localAppData, StringComparison.OrdinalIgnoreCase);
                
                // Extraer ruta de BD
                string dbPath = expanded;
                if (expanded.StartsWith("DataSource=", StringComparison.OrdinalIgnoreCase))
                {
                    dbPath = expanded.Substring("DataSource=".Length);
                }
                else if (expanded.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
                {
                    dbPath = expanded.Substring("Data Source=".Length);
                }
                
                // Si es relativa, combinar con AppData
                if (!Path.IsPathRooted(dbPath))
                {
                    dbPath = Path.Combine(localAppData, dbPath);
                }
                
                // Crear carpeta
                var dir = Path.GetDirectoryName(dbPath);
                if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                {
                    try { Directory.CreateDirectory(dir); } catch { }
                }
                
                return $"Data Source={dbPath};Cache=Shared";
            }

            // Si es "data.db" (relativa sin variable), ponerla en AppData
            if (connectionString.Equals("data.db", StringComparison.OrdinalIgnoreCase) ||
                connectionString.StartsWith("data.db;", StringComparison.OrdinalIgnoreCase) ||
                (connectionString.StartsWith("DataSource=data.db", StringComparison.OrdinalIgnoreCase) ||
                 connectionString.StartsWith("Data Source=data.db", StringComparison.OrdinalIgnoreCase)))
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var dbPath = Path.Combine(appData, "AsistenciaPilares", "data.db");
                var dir = Path.GetDirectoryName(dbPath);
                if (!Directory.Exists(dir))
                {
                    try { Directory.CreateDirectory(dir); } catch { }
                }
                return $"Data Source={dbPath};Cache=Shared";
            }

            return connectionString;
        }
    }
}
