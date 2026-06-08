'use client'

import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: ReactNode
}

export default function FormField({ label, error, required, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#5A6B85] uppercase tracking-[.05em] mb-1.5">
        {label}
        {required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-[#EF4444] mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-[#97A4B8] mt-1">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full px-3 py-[9px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] text-[#15233B] placeholder-[#97A4B8] outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition'

export const selectClass = inputClass + ' cursor-pointer'

export const textareaClass =
  'w-full px-3 py-[9px] rounded-[11px] border border-[#E8EDF4] bg-white text-[13px] text-[#15233B] placeholder-[#97A4B8] outline-none focus:border-[#1F6CF0] focus:ring-2 focus:ring-[#EAF2FE] transition resize-none'
