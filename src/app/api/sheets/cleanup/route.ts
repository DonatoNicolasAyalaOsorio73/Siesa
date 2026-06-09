export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { google } from 'googleapis'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ─── HOJAS ACTIVAS QUE USA LA APP ─────────────────────────────────────────────
const HOJAS_ACTIVAS = new Set([
  'ordenes', 'muestras', 'alertas', 'registrosTiempos',
  'noConformidades', 'inspecciones', 'fichas', 'centros',
  'rutas', 'bom', 'trazabilidad',
])

// ─── ESQUEMAS CORRECTOS ────────────────────────────────────────────────────────
const SCHEMAS: Record<string, string[]> = {
  ordenes: ['id','producto','fichaTecnicaId','rutaId','lineaProduccion','cantidadPlanificada','cantidadProducida','cantidadRechazada','estado','prioridad','operario','fechaInicio','fechaFin','operacionActual','requiereInspeccion','loteId'],
  muestras: ['id','ordenId','loteId','producto','fechaRegistro','inspector','estado','resultados','observaciones'],
  alertas: ['id','tipo','mensaje','detalle','ordenId','loteId','link','timestamp','leida','modulo'],
  registrosTiempos: ['id','ordenId','centroTrabajoId','operario','operacion','fechaInicio','fechaFin','duracionMin','cantidadProducida','observaciones','estado'],
  noConformidades: ['id','ordenId','loteId','producto','lineaProduccion','tipoDefecto','descripcion','cantidadAfectada','severidad','inspector','fecha','accionCorrectiva','estadoCierre','notas'],
  inspecciones: ['id','ordenId','loteId','producto','lineaProduccion','operario','fichaTecnicaId','fechaDisparo','estado','inspector','resultados','observaciones'],
  fichas: ['id','producto','version','nivelAceptableCalidad','frecuenciaMuestreo','tamanoMuestra','criterios'],
  centros: ['id','nombre','tipo','capacidadHoraDia','operador','estado','eficiencia','costoHora'],
  rutas: ['id','nombre','producto','version','estado','costoManoObraHora','operaciones'],
  bom: ['productoId','producto','version','componentes'],
  trazabilidad: ['id','tipo','ordenId','loteId','descripcion','actor','timestamp','modulo'],
}

// ─── MAPEO datos viejos de trazabilidad → nuevo esquema ───────────────────────
function mapearTrazabilidadVieja(row: string[], oldHeaders: string[]): Record<string, string> {
  const get = (col: string) => row[oldHeaders.indexOf(col)] ?? ''
  return {
    id: get('id'),
    tipo: get('evento') || get('tipo') || 'EVENTO',
    ordenId: get('orden_id') || get('ordenId') || '',
    loteId: get('lote_id') || get('loteId') || '',
    descripcion: get('detalle') || get('descripcion') || get('evento') || '',
    actor: get('responsable') || get('actor') || 'Sistema',
    timestamp: get('timestamp') || new Date().toISOString(),
    modulo: get('modulo') || 'SISTEMA',
  }
}

export async function POST() {
  const sid = process.env.GOOGLE_SPREADSHEET_ID
  if (!sid) return NextResponse.json({ error: 'No configurado' }, { status: 500 })

  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const acciones: string[] = []
  const errores: string[] = []

  // ── 1. Leer metadatos de todas las hojas ─────────────────────────────────────
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
  const todasLasHojas = meta.data.sheets ?? []

  // ── 2. Identificar hojas a eliminar ──────────────────────────────────────────
  const hojasMapa = new Map(todasLasHojas.map(h => [h.properties?.title ?? '', h.properties?.sheetId ?? 0]))
  const hojasEliminar = todasLasHojas.filter(h => !HOJAS_ACTIVAS.has(h.properties?.title ?? ''))

  // ── 3. Eliminar hojas no usadas ───────────────────────────────────────────────
  if (hojasEliminar.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sid,
        requestBody: {
          requests: hojasEliminar.map(h => ({
            deleteSheet: { sheetId: h.properties?.sheetId },
          })),
        },
      })
      hojasEliminar.forEach(h => acciones.push(`✓ Eliminada hoja "${h.properties?.title}"`))
    } catch (e: unknown) {
      errores.push(`Error eliminando hojas: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 4. Para cada hoja activa — verificar y corregir encabezados ───────────────
  for (const [tabla, headersEsperados] of Object.entries(SCHEMAS)) {
    const sheetId = hojasMapa.get(tabla)
    if (sheetId === undefined) {
      errores.push(`Hoja "${tabla}" no encontrada (debería crearse en migración)`)
      continue
    }

    try {
      // Leer encabezados actuales
      const actual = await sheets.spreadsheets.values.get({
        spreadsheetId: sid,
        range: `${tabla}!1:1`,
      })
      const headersActuales = (actual.data.values?.[0] ?? []) as string[]

      // Caso especial: trazabilidad con esquema viejo (tiene lote_id en vez de loteId)
      const esEsquemaViejo = headersActuales.includes('lote_id') || headersActuales.includes('orden_id')

      if (esEsquemaViejo && tabla === 'trazabilidad') {
        // Leer datos viejos para migrarlos
        const datosViejos = await sheets.spreadsheets.values.get({
          spreadsheetId: sid,
          range: `${tabla}!A:ZZ`,
        })
        const rows = (datosViejos.data.values ?? []) as string[][]
        const oldHeaders = rows[0] ?? []
        const dataRows = rows.slice(1).filter(r => r[0])

        // Mapear a nuevo esquema
        const datosNuevos = dataRows.map(row => {
          const mapped = mapearTrazabilidadVieja(row, oldHeaders)
          return headersEsperados.map(h => mapped[h as keyof typeof mapped] ?? '')
        })

        // Sobrescribir toda la hoja: headers + datos nuevos
        const valores = [headersEsperados, ...datosNuevos]
        await sheets.spreadsheets.values.clear({ spreadsheetId: sid, range: `${tabla}!A:ZZ` })
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid,
          range: `${tabla}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: valores },
        })
        acciones.push(`✓ Trazabilidad: migrado a nuevo esquema (${datosNuevos.length} eventos)`)
      } else if (JSON.stringify(headersActuales) !== JSON.stringify(headersEsperados)) {
        // Encabezados incorrectos pero no requieren migración de datos — solo actualizar fila 1
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid,
          range: `${tabla}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headersEsperados] },
        })
        acciones.push(`✓ "${tabla}": encabezados corregidos (${headersActuales.length}→${headersEsperados.length} cols)`)
      }

      // ── Aplicar formato visual: fila 1 en negrita con fondo gris ──────────────
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sid,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            }, {
              updateSheetProperties: {
                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
              },
            }],
          },
        })
      } catch { /* formato visual no crítico */ }

    } catch (e: unknown) {
      errores.push(`Error en "${tabla}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 5. Resumen final ──────────────────────────────────────────────────────────
  const metaFinal = await sheets.spreadsheets.get({ spreadsheetId: sid })
  const hojasFinal = metaFinal.data.sheets?.map(h => h.properties?.title) ?? []

  return NextResponse.json({
    ok: errores.length === 0,
    acciones,
    errores,
    hojasFinal,
    totalHojas: hojasFinal.length,
  })
}
