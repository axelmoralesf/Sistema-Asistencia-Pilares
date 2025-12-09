# Electron - PILARES Asistencia

Esta carpeta contiene la configuración de Electron para generar el ejecutable de escritorio.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

## Generar ejecutable

1. **Compilar la API:**
   ```bash
   cd ../API
   dotnet publish -c Release -r win-x64 --self-contained
   ```

2. **Copiar API compilada:**
   ```bash
   # Desde la raíz de Electron
   Copy-Item "..\API\bin\Release\net8.0\win-x64\publish\*" ".\API\" -Recurse -Force
   ```

3. **Generar ejecutable:**
   ```bash
   npm run dist
   ```

El ejecutable se generará en: `../../../Distributable/`

## Estructura

- `main.js` - Proceso principal de Electron
- `preload.js` - Script de preload para seguridad
- `package.json` - Configuración y dependencias
- `API/` - Carpeta donde se copia la API compilada (no incluida en Git)

## Notas

- El ejecutable generado es **portable** (no requiere instalación)
- Incluye la API de .NET embebida
- Tamaño aproximado: ~160 MB (incluye Electron + .NET Runtime)
