import { REGION_COLORS } from './RegionFilter'

const ENOS_COLORS = {
  'El Niño': '#ea580c',
  'La Niña': '#2563eb',
  'Neutro':  '#78716c',
}

const VARIABLE_UNIT = {
  precipitacion_mm: 'mm',
  temp_media_c: '°C',
  humedad_pct: '%',
}

const ttBase = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow-pop)',
  fontSize: 12,
  color: 'var(--text)',
  minWidth: 190,
}

const ttHead = {
  padding: '8px 14px',
  borderBottom: '1px solid var(--border)',
  fontWeight: 600,
  color: 'var(--text)',
}

const ttBody = {
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: color ?? 'var(--text)', fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{value}</span>
    </div>
  )
}

function OverviewTooltip({ payload, label, variable }) {
  if (!payload || payload.length === 0) return null
  const d    = payload[0]?.payload ?? {}
  const unit = VARIABLE_UNIT[variable] ?? ''

  return (
    <div style={ttBase}>
      <div style={ttHead}>
        {d.mes_nombre ?? label}{d.año ? ` · ${d.año}` : ''}
      </div>
      <div style={ttBody}>
        {d.fase_enos && (
          <Row label="Fase ENOS" value={d.fase_enos} color={ENOS_COLORS[d.fase_enos]} />
        )}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {payload.map(entry => {
            const region  = entry.name
            const val     = entry.value
            const tempKey = `${region}__temp`
            return (
              <div key={region} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: REGION_COLORS[region] ?? 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-2)' }}>{region}</span>
                </span>
                <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {typeof val === 'number' ? val.toFixed(1) : val} {unit}
                  {/* {d[tempKey] !== undefined && (
                    <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {d[tempKey].toFixed(1)} °C</span>
                  )} */}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DetailTooltip({ payload, label }) {
  if (!payload || payload.length === 0) return null
  const d = payload[0]?.payload ?? {}

  return (
    <div style={{ ...ttBase, minWidth: 200 }}>
      <div style={ttHead}>
        {d.mes_nombre ?? label}{d.año ? ` · ${d.año}` : ''}
      </div>
      <div style={ttBody}>
        {d.region    && <Row label="Región"        value={d.region} />}
        {d.fase_enos && <Row label="Fase ENOS"     value={d.fase_enos} color={ENOS_COLORS[d.fase_enos]} />}
        {d.precipitacion_mm !== undefined && <Row label="Precipitación" value={`${d.precipitacion_mm.toFixed(1)} mm`} />}
        {d.temp_media_c     !== undefined && <Row label="Temp. media"   value={`${d.temp_media_c.toFixed(1)} °C`} />}
        {d.temp_max_c       !== undefined && <Row label="Temp. máx"     value={`${d.temp_max_c.toFixed(1)} °C`} />}
        {d.temp_min_c       !== undefined && <Row label="Temp. mín"     value={`${d.temp_min_c.toFixed(1)} °C`} />}
        {d.humedad_pct      !== undefined && <Row label="Humedad"       value={`${d.humedad_pct.toFixed(1)} %`} />}
        {d.viento_kmh       !== undefined && <Row label="Viento"        value={`${d.viento_kmh.toFixed(1)} km/h`} />}
      </div>
    </div>
  )
}

export default function TooltipCustom({ active, payload, label, mode, variable }) {
  if (!active) return null
  if (mode === 'overview') return <OverviewTooltip payload={payload} label={label} variable={variable} />
  return <DetailTooltip payload={payload} label={label} />
}
