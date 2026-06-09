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

export async function GET() {
  const sid = process.env.GOOGLE_SPREADSHEET_ID
  if (!sid) return NextResponse.json({ error: 'No configurado' }, { status: 500 })

  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
  const hojas = meta.data.sheets ?? []

  const resultado = await Promise.all(hojas.map(async (h) => {
    const titulo = h.properties?.title ?? ''
    const sheetId = h.properties?.sheetId
    try {
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: sid,
        range: `${titulo}!A1:ZZ1000`,
      })
      const rows = data.data.values ?? []
      const headers = rows[0] ?? []
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''))
      return {
        titulo,
        sheetId,
        columnas: headers,
        filas: dataRows.length,
        muestra: dataRows.slice(0, 2),
      }
    } catch {
      return { titulo, sheetId, columnas: [], filas: 0, muestra: [], error: 'No se pudo leer' }
    }
  }))

  return NextResponse.json(resultado)
}
