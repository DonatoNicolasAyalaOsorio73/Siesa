# Siesa MES — Manufacturing Execution System

Prototipo funcional de alta fidelidad del módulo de Manufactura y Calidad
para Siesa Enterprise, desarrollado mediante Vibe Coding con Claude Code.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS con design system Siesa
- Recharts para visualizaciones
- Google Gemini para IA (con fallback offline inteligente)
- Google Sheets como backend mock

## Variables de entorno requeridas

```
GEMINI_API_KEY=     # Google AI Studio (aistudio.google.com/app/apikey)
NEXT_PUBLIC_SHEET_ID=1HwHCUEfGPRG8mpiEEV1qKjSbTqS2dnz3
```

## Fuente de datos

Google Sheets público:
https://docs.google.com/spreadsheets/d/1HwHCUEfGPRG8mpiEEV1qKjSbTqS2dnz3

## Módulos implementados

- **Manufactura:** Órdenes, Rutas, Centros de Trabajo, Lista de Materiales,
  Estructura de Costos, Costeo de Rutas, Registro de Tiempos, Avance en Planta
- **Calidad:** Inspecciones Pendientes, No Conformidades, Trazabilidad, Indicadores
- **IA:** Asistente de defectos por voz/texto + Análisis predictivo de riesgo
- **Dashboard:** Vista ejecutiva unificada con KPIs, gráficas y alertas en tiempo real

## Integración bidireccional

- Manufactura → Calidad: completar operación dispara inspección automática
- Calidad → Manufactura: rechazar lote detiene la orden en producción

## Deploy

https://siesa-mes.vercel.app  ← actualizar con URL real
