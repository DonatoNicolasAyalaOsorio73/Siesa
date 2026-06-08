// ─── Helper cliente para sincronizar con Google Sheets via API routes ─────────
// Patrón write-through: el estado local se actualiza de inmediato, Sheets
// recibe la escritura en background. Si falla, el dato persiste en localStorage.

export async function cargarDeSheets<T>(tabla: string): Promise<T[] | null> {
  try {
    const res = await fetch(`/api/sheets/${tabla}`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? (data as T[]) : null
  } catch {
    return null
  }
}

export function pushASheets(
  tabla: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>,
): void {
  // Fire and forget — nunca bloquea la UI
  fetch(`/api/sheets/${tabla}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err: Error) => {
    console.warn(`[Sheets] ${method} ${tabla} falló:`, err.message)
  })
}
