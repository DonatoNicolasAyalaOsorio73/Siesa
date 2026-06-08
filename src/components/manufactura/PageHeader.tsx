interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  children?: React.ReactNode
}

export default function PageHeader({ titulo, subtitulo, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-poppins font-semibold text-[#15233B] leading-tight">{titulo}</h1>
        {subtitulo && (
          <p className="text-[13.5px] text-[#5A6B85] mt-[3px]">{subtitulo}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 shrink-0">{children}</div>
      )}
    </div>
  )
}
