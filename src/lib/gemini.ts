// ─── PARSE ROBUSTO DE JSON DE GEMINI ─────────────────────────────────────────
// Gemini a veces envuelve la respuesta en ```json ... ``` o agrega texto
// antes/después del JSON. Esta función extrae el primer objeto/array JSON válido.

export function parseJsonGemini(texto: string): any {
  // 1. Quitar bloques markdown: ```json ... ``` o ``` ... ```
  let limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  // 2. Si hay texto antes del primer { o [, cortarlo
  const inicio = limpio.search(/[{\[]/)
  if (inicio > 0) limpio = limpio.slice(inicio)

  // 3. Encontrar el cierre balanceado del JSON
  if (limpio.startsWith('{') || limpio.startsWith('[')) {
    const abre = limpio[0] === '{' ? '{' : '['
    const cierra = abre === '{' ? '}' : ']'
    let depth = 0
    let enString = false
    let escape = false
    let fin = -1
    for (let i = 0; i < limpio.length; i++) {
      const c = limpio[i]
      if (escape) { escape = false; continue }
      if (c === '\\' && enString) { escape = true; continue }
      if (c === '"') { enString = !enString; continue }
      if (enString) continue
      if (c === abre) depth++
      else if (c === cierra) { depth--; if (depth === 0) { fin = i; break } }
    }
    if (fin !== -1) limpio = limpio.slice(0, fin + 1)
  }

  return JSON.parse(limpio)
}
