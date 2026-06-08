// ─── Helper cliente para sincronizar con Google Sheets via API routes ─────────

export async function cargarDeSheets<T>(tabla: string): Promise<T[] | null> {
  try {
    const res = await fetch(`/api/sheets/${tabla}`, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[Sheets] GET ${tabla} → HTTP ${res.status}`)
      return null
    }
    const data = await res.json()
    if (!Array.isArray(data)) {
      console.warn(`[Sheets] GET ${tabla} → respuesta no es array:`, data)
      return null
    }
    console.info(`[Sheets] ✓ ${tabla}: ${data.length} registros cargados`)
    return data as T[]
  } catch (err: unknown) {
    console.error(`[Sheets] GET ${tabla} → error:`, err instanceof Error ? err.message : err)
    return null
  }
}

export function pushASheets(
  tabla: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>,
): void {
  fetch(`/api/sheets/${tabla}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) console.warn(`[Sheets] ${method} ${tabla} → HTTP ${res.status}`)
    })
    .catch((err: Error) => {
      console.warn(`[Sheets] ${method} ${tabla} → error:`, err.message)
    })
}
