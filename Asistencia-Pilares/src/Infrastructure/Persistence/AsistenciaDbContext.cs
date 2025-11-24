using Microsoft.EntityFrameworkCore;
using Core.Entities;
using AsistenciaAPI.Application.Common.Interfaces;

namespace AsistenciaAPI.Infrastructure.Persistence
{
    public class AsistenciaDbContext : DbContext, IApplicationDbContext
    {
        public AsistenciaDbContext(DbContextOptions<AsistenciaDbContext> options) : base(options)
        {
        }

        public DbSet<Empleado> Empleados { get; set; }
        public DbSet<Area> Areas { get; set; }
        public DbSet<Rol> Roles { get; set; }
        public DbSet<HorarioLaboral> HorariosLaborales { get; set; }
        public DbSet<RegistroAsistencia> RegistrosAsistencia { get; set; }
        public DbSet<ReporteGuardado> ReportesGuardados { get; set; } // ✅ NUEVO

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Empleado>().ToTable("Empleados");
            modelBuilder.Entity<Area>().ToTable("Areas");
            modelBuilder.Entity<Rol>().ToTable("Roles");
            modelBuilder.Entity<HorarioLaboral>().ToTable("HorariosLaborales");
            modelBuilder.Entity<RegistroAsistencia>().ToTable("RegistrosAsistencia");
            modelBuilder.Entity<ReporteGuardado>().ToTable("ReportesGuardados"); // ✅ NUEVO

            modelBuilder.Entity<Empleado>()
                .HasMany(e => e.Horarios)
                .WithOne(h => h.Empleado)
                .HasForeignKey(h => h.EmpleadoId);

            modelBuilder.Entity<Empleado>()
                .HasMany(e => e.Asistencias)
                .WithOne(a => a.Empleado)
                .HasForeignKey(a => a.EmpleadoId);

            // ✅ NUEVO: Relación ReporteGuardado -> Empleado (opcional)
            modelBuilder.Entity<ReporteGuardado>()
                .HasOne(r => r.Empleado)
                .WithMany()
                .HasForeignKey(r => r.EmpleadoId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
