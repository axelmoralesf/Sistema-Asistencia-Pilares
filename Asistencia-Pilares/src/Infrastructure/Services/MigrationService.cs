using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using AsistenciaAPI.Infrastructure.Persistence;

namespace AsistenciaAPI.Infrastructure.Services
{
    public class MigrationService : IMigrationService
    {
    private readonly AsistenciaDbContext _db;
    private readonly IHostEnvironment _env;
    private readonly ISeeder _seeder;

        public MigrationService(AsistenciaDbContext db, IHostEnvironment env, ISeeder seeder)
        {
            _db = db;
            _env = env;
            _seeder = seeder;
        }

        public void ApplyMigrationsAndSeed()
        {
            try
            {
                // Usar EnsureCreated() que no valida migraciones pendientes
                // En producción, ejecutar "dotnet ef database update" manualmente antes de deploy
                _db.Database.EnsureCreated();
                _seeder.Seed();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] En ApplyMigrationsAndSeed: {ex}");
                throw;
            }
        }
    }
}
