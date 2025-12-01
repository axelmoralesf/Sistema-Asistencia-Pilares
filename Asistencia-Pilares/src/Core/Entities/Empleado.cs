using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Entities
{
    public class Empleado
    {
        // Constructor: genera un Id por defecto y listas vacías
        public Empleado()
        {
            Id = Guid.NewGuid();
            EstaActivo = true;
            Horarios = new List<HorarioLaboral>();
            Asistencias = new List<RegistroAsistencia>();
        }

        /// <summary>
        /// Llave primaria interna
        /// </summary>
        [Key]
        public Guid Id { get; set; }

        /// <summary>
        /// ID externo que usa el empleado para checar (ej: "1025")
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string IdEmpleadoExterno { get; set; }

        /// <summary>
        /// Nombre completo del empleado
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Nombre { get; set; }

        /// <summary>
        /// Indica si el empleado está activo
        /// </summary>
        public bool EstaActivo { get; set; }

    /// <summary>
    /// Indica si el empleado es administrador del sistema (requiere contraseña)
    /// </summary>
    public bool EsAdmin { get; set; }

    /// <summary>
    /// Hash de la contraseña (almacenamiento seguro). Es nullable porque la mayoría de empleados no necesitan contraseña.
    /// </summary>
    public string? PasswordHash { get; set; }

        /// <summary>
        /// Correo electrónico del empleado (opcional)
        /// </summary>
        [MaxLength(200)]
        public string? Email { get; set; }

        /// <summary>
        /// Teléfono de contacto del empleado (opcional)
        /// </summary>
        [MaxLength(50)]
        public string? Telefono { get; set; }
        
        /// <summary>
        /// Llave foránea al área (OPCIONAL)
        /// </summary>
        public Guid? AreaId { get; set; }

        /// <summary>
        /// Propiedad de navegación al área
        /// </summary>
        [ForeignKey(nameof(AreaId))]
        public Area? Area { get; set; }

        /// <summary>
        /// Llave foránea al rol (OPCIONAL)
        /// </summary>
        public Guid? RolId { get; set; }

        /// <summary>
        /// Propiedad de navegación al rol
        /// </summary>
        [ForeignKey(nameof(RolId))]
        public Rol? Rol { get; set; }

        /// <summary>
        /// Horarios laborales asociados
        /// </summary>
        public ICollection<HorarioLaboral> Horarios { get; set; }

        /// <summary>
        /// Registros de asistencia asociados
        /// </summary>
        public ICollection<RegistroAsistencia> Asistencias { get; set; }
    }
}
