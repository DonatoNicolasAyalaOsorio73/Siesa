# Siesa MES — Instrucciones de instalación

## Requisitos previos

Instalar **Node.js 18+** desde: https://nodejs.org/en/download

## Instalación

```bash
cd C:\Users\donat\Desktop\Siesa
npm install
npm run dev
```

Abrir: http://localhost:3000

## Estructura

```
src/
├── app/
│   ├── globals.css       # Estilos globales + Roboto
│   ├── layout.tsx        # Root layout (server)
│   └── page.tsx          # Dashboard ejecutivo
├── components/
│   ├── Sidebar.tsx       # Sidebar navegación
│   ├── Header.tsx        # Header + reloj + notificaciones
│   └── SidebarWrapper.tsx
├── context/
│   └── AppContext.tsx    # Estado global (ordenes, alertas)
└── data/
    └── mockData.ts       # Datos mock + fetchSheet
```
