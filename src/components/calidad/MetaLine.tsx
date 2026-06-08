'use client'

import { ReferenceLine } from 'recharts'

interface MetaLineProps {
  value: number
  label?: string
  color?: string
  dashed?: boolean
}

export default function MetaLine({ value, label = 'Meta', color = '#16B364', dashed = false }: MetaLineProps) {
  return (
    <ReferenceLine
      y={value}
      stroke={color}
      strokeDasharray={dashed ? '6 3' : undefined}
      strokeWidth={1.5}
      label={{
        value: label,
        position: 'insideTopRight',
        fontSize: 10,
        fill: color,
        fontWeight: 600,
      }}
    />
  )
}
