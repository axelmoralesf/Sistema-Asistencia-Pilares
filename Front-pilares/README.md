# Frontend - Sistema de Asistencia PILARES

Sistema web de gestión de asistencias para el programa PILARES de la Ciudad de México.

## 🚀 Requisitos

- Node.js 18+
- npm 9+

## 📦 Instalación

```bash
# Instalar dependencias
npm install
```

## 💻 Desarrollo

```bash
# Iniciar servidor de desarrollo en http://localhost:3000
npm start
```

## 🏗️ Producción

```bash
# Compilar para producción (output: build/)
npm run build

# El build se sirve desde la API en /wwwroot
```

## 📋 Módulos

### 1. Control de Asistencias
- Registro de entrada/salida
- Escaneo de código QR
- Confirmación visual de registro

### 2. Gestión de Empleados
- Lista de empleados activos
- Alta/edición de empleados
- Búsqueda y filtros
- Asignación de roles y horarios

### 3. Reportes
- Generación de reportes por periodo
- Filtros por empleado, área y fecha
- Exportación a PDF
- Visualización de gráficos

## 🎨 Diseño

### Paleta de Colores
- **#6E1F34** - Vino/Bordó (encabezados)
- **#E0CCA7** - Beige claro (fondo)
- **#7D323F** - Guinda (botones principales)

### Tipografía
- **Montserrat** - Títulos
- **Open Sans** - Texto general

## 🔌 API

El frontend consume la API REST en:
- **Desarrollo**: `http://localhost:5000`
- **Producción**: Mismo origen (servido por la API)

## 📁 Estructura

```
src/
├── components/
│   ├── attendance/    # Módulo de asistencias
│   ├── employees/     # Módulo de empleados
│   ├── reports/       # Módulo de reportes
│   └── common/        # Componentes compartidos
├── styles/
│   ├── globals.css    # Estilos globales
│   ├── colors.js      # Paleta de colores
│   └── typography.js  # Tipografía
└── App.jsx            # Componente principal
```

## 📄 Licencia

Gobierno de la Ciudad de México - PILARES
