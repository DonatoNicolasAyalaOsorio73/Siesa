import { google } from 'googleapis'

// ─── CLIENTE ──────────────────────────────────────────────────────────────────

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

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const SPREADSHEET_ID = () => {
  const id = process.env.GOOGLE_SPREADSHEET_ID
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID no configurado')
  return id
}

// ─── CONVERSIÓN filas ↔ objetos ────────────────────────────────────────────

function rowsToObjects(rows: string[][]): Record<string, unknown>[] {
  if (!rows || rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((r) => r[0]).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      const val = row[i] ?? ''
      if (val === '') { obj[h] = null; return }
      if (val === 'true') { obj[h] = true; return }
      if (val === 'false') { obj[h] = false; return }
      if (val.startsWith('{') || val.startsWith('[')) {
        try { obj[h] = JSON.parse(val); return } catch { /* keep as string */ }
      }
      const num = Number(val)
      obj[h] = Number.isFinite(num) && val.trim() !== '' ? num : val
    })
    return obj
  })
}

function objectToRow(obj: Record<string, unknown>, headers: string[]): string[] {
  return headers.map((h) => {
    const val = obj[h]
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  })
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

export async function leerHoja<T>(tab: string): Promise<T[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A:ZZ`,
  })
  return rowsToObjects((res.data.values ?? []) as string[][]) as unknown as T[]
}

export async function agregarFila(
  tab: string,
  headers: string[],
  obj: Record<string, unknown>,
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [objectToRow(obj, headers)] },
  })
}

export async function actualizarFila(
  tab: string,
  headers: string[],
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const sheets = getSheetsClient()
  const sid = SPREADSHEET_ID()

  // Encuentra el número de fila por id (columna A)
  const idCol = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${tab}!A:A`,
  })
  const rows = (idCol.data.values ?? []) as string[][]
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIdx === -1) throw new Error(`id "${id}" no encontrado en hoja ${tab}`)
  const sheetRow = rowIdx + 1 // 1-based

  // Lee la fila actual para hacer merge
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${tab}!A${sheetRow}:ZZ${sheetRow}`,
  })
  const currentRow = (current.data.values?.[0] ?? []) as string[]
  const currentObj: Record<string, unknown> = {}
  headers.forEach((h, i) => { currentObj[h] = currentRow[i] ?? '' })

  const merged = { ...currentObj, ...data }
  await sheets.spreadsheets.values.update({
    spreadsheetId: sid,
    range: `${tab}!A${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [objectToRow(merged, headers)] },
  })
}

export async function eliminarFila(tab: string, id: string): Promise<void> {
  const sheets = getSheetsClient()
  const sid = SPREADSHEET_ID()

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === tab)
  const sheetId = sheet?.properties?.sheetId
  if (sheetId === undefined) throw new Error(`Hoja "${tab}" no encontrada`)

  const idCol = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${tab}!A:A`,
  })
  const rows = (idCol.data.values ?? []) as string[][]
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIdx === -1) throw new Error(`id "${id}" no encontrado en hoja ${tab}`)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sid,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIdx,
            endIndex: rowIdx + 1,
          },
        },
      }],
    },
  })
}

export async function agregarFilas(
  tab: string,
  headers: string[],
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows.map((obj) => objectToRow(obj, headers)) },
  })
}

export async function inicializarHoja(tab: string, headers: string[]): Promise<void> {
  const sheets = getSheetsClient()
  const sid = SPREADSHEET_ID()

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
  const existe = meta.data.sheets?.some((s) => s.properties?.title === tab)

  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    })
  }

  // Lee la fila de encabezados completa (no solo A1)
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: sid,
    range: `${tab}!1:1`,
  })
  const existingHeaders = (check.data.values?.[0] ?? []) as string[]

  // Escribe/actualiza encabezados si faltan o están incompletos
  if (existingHeaders.length < headers.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sid,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    })
  }
}
