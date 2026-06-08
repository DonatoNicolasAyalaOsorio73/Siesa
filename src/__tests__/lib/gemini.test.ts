import { describe, it, expect } from 'vitest'
import { parseJsonGemini } from '@/lib/gemini'

describe('parseJsonGemini', () => {
  it('parsea JSON limpio directamente', () => {
    const input = '{"nivelRiesgo": "ALTO", "puntuacion": 85}'
    expect(parseJsonGemini(input)).toEqual({ nivelRiesgo: 'ALTO', puntuacion: 85 })
  })

  it('quita el bloque markdown ```json ... ```', () => {
    const input = '```json\n{"resultado": "ok"}\n```'
    expect(parseJsonGemini(input)).toEqual({ resultado: 'ok' })
  })

  it('quita el bloque markdown ``` sin tipo', () => {
    const input = '```\n{"resultado": "ok"}\n```'
    expect(parseJsonGemini(input)).toEqual({ resultado: 'ok' })
  })

  it('ignora texto antes del JSON', () => {
    const input = 'Aquí está el análisis:\n{"nivel": "BAJO"}'
    expect(parseJsonGemini(input)).toEqual({ nivel: 'BAJO' })
  })

  it('ignora texto después del JSON', () => {
    const input = '{"nivel": "BAJO"}\nEspero que sea útil.'
    expect(parseJsonGemini(input)).toEqual({ nivel: 'BAJO' })
  })

  it('parsea arrays JSON', () => {
    const input = '[{"id": 1}, {"id": 2}]'
    expect(parseJsonGemini(input)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('maneja JSON anidado con objetos y arrays', () => {
    const input = `\`\`\`json
{
  "causasRaiz": [
    {"causa": "Desviación térmica", "frecuencia": 3}
  ],
  "resumen": "Análisis completo"
}
\`\`\``
    const result = parseJsonGemini(input)
    expect(result.causasRaiz).toHaveLength(1)
    expect(result.causasRaiz[0].causa).toBe('Desviación térmica')
    expect(result.resumen).toBe('Análisis completo')
  })

  it('maneja strings con llaves internas sin confundirlas con el cierre', () => {
    const input = '{"mensaje": "Usa {este} formato", "ok": true}'
    expect(parseJsonGemini(input)).toEqual({ mensaje: 'Usa {este} formato', ok: true })
  })

  it('maneja escape de comillas dentro de strings', () => {
    const input = '{"descripcion": "El operario dijo \\"ok\\" y cerró"}'
    expect(parseJsonGemini(input)).toEqual({ descripcion: 'El operario dijo "ok" y cerró' })
  })

  it('lanza SyntaxError si el JSON es inválido', () => {
    expect(() => parseJsonGemini('esto no es json')).toThrow(SyntaxError)
  })

  it('lanza SyntaxError si el JSON está truncado', () => {
    expect(() => parseJsonGemini('{"nivel": "AL')).toThrow(SyntaxError)
  })
})
