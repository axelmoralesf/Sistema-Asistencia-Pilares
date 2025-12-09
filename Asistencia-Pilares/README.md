# Backend API - Sistema de Asistencia PILARES

API REST desarrollada en ASP.NET Core 8.0 para la gestión de asistencias del programa PILARES.

## 🚀 Requisitos

- .NET 8.0 SDK
- SQLite (desarrollo)

## 📦 Instalación

```bash
# Restaurar dependencias
dotnet restore
```

## 💻 Desarrollo

```bash
# Desde la carpeta src/API
cd src/API
dotnet run

# La API estará disponible en http://localhost:5000
```

La base de datos SQLite se crea automáticamente en:
- **Windows**: `%LOCALAPPDATA%\AsistenciaPilares\data.db`
- **Otros**: `~/.local/share/AsistenciaPilares/data.db`

## 🏗️ Producción

```bash
# Compilar para producción (win-x64)
dotnet publish src/API/AsistenciaAPI.API.csproj -c Release -r win-x64 --self-contained
```

## 📁 Estructura del Proyecto

```
src/
├── API/              # Endpoints y configuración
├── Application/      # Servicios y DTOs
├── Core/            # Entidades del dominio
└── Infrastructure/  # DbContext y persistencia
```

### Capas

**API** - Controllers, configuración de servicios, middleware
**Application** - Lógica de negocio, servicios, DTOs, AutoMapper
**Core** - Entidades de dominio (Empleado, Area, Rol, etc.)
**Infrastructure** - DbContext, migraciones, repositorios

## 🗄️ Base de Datos

### Migraciones

```bash
# Crear nueva migración
cd src/Infrastructure
dotnet ef migrations add NombreMigracion --startup-project ../API/AsistenciaAPI.API.csproj

# Aplicar migraciones
dotnet ef database update --startup-project ../API/AsistenciaAPI.API.csproj
```

### Seed de Datos

El sistema incluye datos iniciales (áreas, roles, usuarios demo) que se crean automáticamente al iniciar la aplicación por primera vez.

## 🔌 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Empleados
- `GET /api/empleados` - Listar empleados
- `GET /api/empleados/{id}` - Obtener empleado
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/{id}` - Actualizar empleado
- `DELETE /api/empleados/{id}` - Eliminar empleado

### Asistencias
- `POST /api/asistencia/registrar` - Registrar entrada/salida
- `GET /api/asistencia/historial` - Obtener historial

### Reportes
- `POST /api/reportes/generar` - Generar reporte
- `POST /api/reportes/exportar-pdf` - Exportar a PDF

### Áreas
- `GET /api/areas` - Listar áreas
- `POST /api/areas` - Crear área

### Roles
- `GET /api/roles` - Listar roles

### Salud
- `GET /health/db` - Verificar conexión a BD

## ⚙️ Configuración

La configuración se encuentra en:
- `appsettings.json` - Configuración general
- `appsettings.Development.json` - Solo desarrollo

### Variables de Entorno

- `ConnectionStrings__DefaultConnection` - String de conexión personalizada
- `ASPNETCORE_ENVIRONMENT` - Entorno (Development/Production)

## 🔐 Seguridad

- Autenticación basada en sesiones
- Contraseñas hasheadas con BCrypt
- CORS configurado
- Validación de datos con FluentValidation

## 📄 Licencia

Gobierno de la Ciudad de México - PILARES

