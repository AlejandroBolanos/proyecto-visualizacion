const ENOS_COLORS = {
  'El Niño': '#fb923c',
  'La Niña': '#60a5fa',
  'Neutro': '#94a3b8',
}

export default function TooltipCustom({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  const d = payload[0]?.payload ?? {}

  return (
    <div
      className="rounded-xl border border-slate-600 shadow-2xl text-xs"
      style={{ background: '#1e293b', minWidth: 200 }}
    >
      <div className="px-4 py-2 border-b border-slate-700 font-semibold text-slate-200">
        {d.mes_nombre ?? label} {d.año ? `· ${d.año}` : ''}
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {d.region && (
          <Row label="Región" value={d.region} />
        )}
        {d.fase_enos !== undefined && (
          <Row
            label="Fase ENOS"
            value={
              <span style={{ color: ENOS_COLORS[d.fase_enos] ?? '#e2e8f0' }}>
                {d.fase_enos}
              </span>
            }
          />
        )}
        {d.precipitacion_mm !== undefined && (
          <Row label="Precipitación" value={`${d.precipitacion_mm.toFixed(1)} mm`} />
        )}
        {d.temp_media_c !== undefined && (
          <Row label="Temp. media" value={`${d.temp_media_c.toFixed(1)} °C`} />
        )}
        {d.temp_max_c !== undefined && (
          <Row label="Temp. máx" value={`${d.temp_max_c.toFixed(1)} °C`} />
        )}
        {d.temp_min_c !== undefined && (
          <Row label="Temp. mín" value={`${d.temp_min_c.toFixed(1)} °C`} />
        )}
        {d.humedad_pct !== undefined && (
          <Row label="Humedad" value={`${d.humedad_pct.toFixed(1)} %`} />
        )}
        {d.viento_kmh !== undefined && (
          <Row label="Viento" value={`${d.viento_kmh.toFixed(1)} km/h`} />
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  )
}
