import { REGION_COLORS } from './RegionFilter'

const ENOS_COLORS = {
  'El Niño': '#fb923c',
  'La Niña': '#60a5fa',
  'Neutro':  '#94a3b8',
}

const VARIABLE_UNIT = {
  precipitacion_mm: 'mm',
  temp_media_c: '°C',
  humedad_pct: '%',
}

/** Overview tooltip — shows all regions from payload + ENOS phase */
function OverviewTooltip({ payload, label, variable }) {
  if (!payload || payload.length === 0) return null
  const d = payload[0]?.payload ?? {}
  const unit = VARIABLE_UNIT[variable] ?? ''

  return (
    <div className="rounded-xl border border-slate-600 shadow-2xl text-xs" style={{ background: '#1e293b', minWidth: 190 }}>
      <div className="px-4 py-2 border-b border-slate-700 font-semibold text-slate-200">
        {d.mes_nombre ?? label}
        {d.año ? ` · ${d.año}` : ''}
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {d.fase_enos && (
          <Row
            label="Fase ENOS"
            value={<span style={{ color: ENOS_COLORS[d.fase_enos] }}>{d.fase_enos}</span>}
          />
        )}
        <div className="border-t border-slate-700/60 pt-1.5 mt-1.5 space-y-1">
          {payload.map((entry) => {
            const region = entry.name
            const val = entry.value
            const tempKey = `${region}__temp`
            return (
              <div key={region} className="flex justify-between gap-4">
                <span style={{ color: REGION_COLORS[region] ?? '#94a3b8' }}>{region}</span>
                <span className="text-slate-200 font-medium">
                  {typeof val === 'number' ? val.toFixed(1) : val} {unit}
                  {d[tempKey] !== undefined && (
                    <span className="text-slate-500 font-normal"> · {d[tempKey].toFixed(1)} °C</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Detail tooltip — shows all climate variables for a single region */
function DetailTooltip({ payload, label }) {
  if (!payload || payload.length === 0) return null
  const d = payload[0]?.payload ?? {}

  return (
    <div className="rounded-xl border border-slate-600 shadow-2xl text-xs" style={{ background: '#1e293b', minWidth: 200 }}>
      <div className="px-4 py-2 border-b border-slate-700 font-semibold text-slate-200">
        {d.mes_nombre ?? label}{d.año ? ` · ${d.año}` : ''}
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {d.region && <Row label="Región" value={d.region} />}
        {d.fase_enos && (
          <Row
            label="Fase ENOS"
            value={<span style={{ color: ENOS_COLORS[d.fase_enos] }}>{d.fase_enos}</span>}
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

export default function TooltipCustom({ active, payload, label, mode, variable }) {
  if (!active) return null
  if (mode === 'overview') {
    return <OverviewTooltip payload={payload} label={label} variable={variable} />
  }
  return <DetailTooltip payload={payload} label={label} />
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  )
}
