const ENOS_META = [
  { fase: 'El Niño', color: '#fb923c', bg: 'rgba(251,146,60,0.15)', desc: 'Aguas oceánicas más cálidas' },
  { fase: 'La Niña', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', desc: 'Aguas oceánicas más frías' },
  { fase: 'Neutro',  color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', desc: 'Condiciones normales' },
]

export default function EnosLegend() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fase ENOS:</span>
      {ENOS_META.map(({ fase, color, bg, desc }) => (
        <div
          key={fase}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
          style={{ borderColor: color, backgroundColor: bg }}
          title={desc}
        >
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span style={{ color }} className="font-medium">{fase}</span>
        </div>
      ))}
    </div>
  )
}
