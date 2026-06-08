import { NextResponse } from 'next/server'
import { inicializarHoja, leerHoja } from '@/lib/googleSheets'

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY ?? ''

  const configurado = !!(spreadsheetId && email && key.startsWith('-----BEGIN'))

  if (!configurado) {
    return NextResponse.json({
      ok: false,
      mensaje: 'Credenciales no configuradas o incompletas',
      detalle: {
        spreadsheetId: spreadsheetId ? '✓' : '✗ falta GOOGLE_SPREADSHEET_ID',
        email: email ? '✓' : '✗ falta GOOGLE_SERVICE_ACCOUNT_EMAIL',
        privateKey: key.startsWith('-----BEGIN')
          ? '✓'
          : key
          ? '✗ tiene valor pero no es una clave PEM (debe empezar con -----BEGIN PRIVATE KEY-----)'
          : '✗ falta GOOGLE_PRIVATE_KEY',
      },
    })
  }

  try {
    await inicializarHoja('ordenes', ['id','producto','fichaTecnicaId','rutaId','lineaProduccion','cantidadPlanificada','cantidadProducida','cantidadRechazada','estado','prioridad','operario','fechaInicio','fechaFin','operacionActual','requiereInspeccion','loteId'])
    await leerHoja('ordenes')
    return NextResponse.json({
      ok: true,
      mensaje: 'Conexión exitosa con Google Sheets',
      spreadsheetId,
      email,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, mensaje: 'Error al conectar', error: msg }, { status: 500 })
  }
}
