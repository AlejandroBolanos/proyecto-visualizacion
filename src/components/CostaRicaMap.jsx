import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { geoArea, geoMercator, geoPath } from 'd3-geo'
import { REGION_COLORS } from './RegionFilter'
import { aggregateToMonthly, MES_NOMBRES } from './ClimateChart'

const GEO_URL = '/data/cr_zones.geojson'

const W = 800
const H = 480
const MAP_EXTENT = [[70, 28], [730, 452]]

const REGION_LABELS = {
  'Pacífico Norte':   'Pac. Norte',
  'Pacífico Central': 'Pac. Central',
  'Pacífico Sur':     'Pac. Sur',
  'Valle Central':    'Valle Central',
  'Zona Norte':       'Zona Norte',
  'Caribe Norte':     'Caribe Norte',
  'Caribe Sur':       'Caribe Sur',
}

const LABEL_OFFSETS = {
  'Pacífico Norte':   [-16, 0],
  'Zona Norte':       [8, -4],
  'Caribe Norte':     [16, -2],
  'Valle Central':    [2, 4],
  'Pacífico Central': [12, -4],
  'Caribe Sur':       [18, 0],
  'Pacífico Sur':     [-10, 14],
}

function normalizeFeatureWinding(feature) {
  if (!feature?.geometry || geoArea(feature) <= 1) return feature
  const clone = structuredClone(feature)
  if (clone.geometry.type === 'Polygon') {
    clone.geometry.coordinates = clone.geometry.coordinates.map(ring => [...ring].reverse())
  } else if (clone.geometry.type === 'MultiPolygon') {
    clone.geometry.coordinates = clone.geometry.coordinates.map(polygon =>
      polygon.map(ring => [...ring].reverse()),
    )
  }
  return clone
}

// ─── 6-stop choropleth scales (r,g,b tuples) ─────────────────────────────────

const COLOR_STOPS = {
  precipitacion_mm: [
    [240, 249, 255],  // #f0f9ff
    [186, 230, 253],  // #bae6fd
    [125, 211, 252],  // #7dd3fc
    [59,  130, 246],  // #3b82f6
    [37,  99,  235],  // #2563eb
    [30,  64,  175],  // #1e40af
  ],
  temp_media_c: [
    [254, 243, 199],  // #fef3c7
    [252, 211, 77],   // #fcd34d
    [251, 146, 60],   // #fb923c
    [239, 68,  68],   // #ef4444
    [220, 38,  38],   // #dc2626
    [185, 28,  28],   // #b91c1c
  ],
  humedad_pct: [
    [236, 253, 245],  // #ecfdf5
    [167, 243, 208],  // #a7f3d0
    [52,  211, 153],  // #34d399
    [5,   150, 105],  // #059669
    [4,   120, 87],   // #047857
    [6,   95,  70],   // #065f46
  ],
}

const VARIABLE_LABEL = {
  precipitacion_mm: 'Precipitación (mm)',
  temp_media_c:     'Temp. media (°C)',
  humedad_pct:      'Humedad (%)',
}
const VARIABLE_UNIT  = { precipitacion_mm: 'mm', temp_media_c: '°C', humedad_pct: '%' }
const ENOS_COLORS    = { 'El Niño': '#ea580c', 'La Niña': '#2563eb', 'Neutro': '#78716c' }

function scaleColor(value, min, max, variable) {
  if (value == null || isNaN(value)) return '#e7e5e4'
  const stops = COLOR_STOPS[variable] ?? COLOR_STOPS.precipitacion_mm
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const N = stops.length - 1
  const seg = Math.min(Math.floor(t * N), N - 1)
  const local = t * N - seg
  const [r0, g0, b0] = stops[seg]
  const [r1, g1, b1] = stops[seg + 1]
  return `rgb(${Math.round(r0 + (r1 - r0) * local)},${Math.round(g0 + (g1 - g0) * local)},${Math.round(b0 + (b1 - b0) * local)})`
}

function formatMapValue(data, variable) {
  const value = data?.[variable]
  if (value == null || isNaN(value)) return null
  return `${value.toFixed(1)}${VARIABLE_UNIT[variable] ?? ''}`
}

function labelBoxSize(label, valueText) {
  const width = Math.max(label.length * 7.2, valueText ? valueText.length * 6.2 : 0) + 24
  return { width: Math.max(68, width), height: valueText ? 38 : 26 }
}

// ─── Map data builder ─────────────────────────────────────────────────────────

function buildMapData(rawRecords, source, dayRange, selectedYear, selectedMonths) {
  let data = [...rawRecords]
  if (source === 'daily') {
    const { from, to } = dayRange
    if (from !== 1 || to !== 31) data = data.filter(d => d.dia >= from && d.dia <= to)
    data = aggregateToMonthly(data)
  }
  if (selectedYear !== 'all') data = data.filter(d => d.año === selectedYear)
  if (selectedMonths.length < 12) data = data.filter(d => selectedMonths.includes(d.mes))

  const byRegion = {}
  for (const d of data) (byRegion[d.region] ??= []).push(d)

  const result = {}
  for (const [region, items] of Object.entries(byRegion)) {
    const n   = items.length
    const avg = c => items.reduce((s, d) => s + (d[c] ?? 0), 0) / n
    result[region] = {
      precipitacion_mm: +avg('precipitacion_mm').toFixed(1),
      temp_media_c:     +avg('temp_media_c').toFixed(1),
      temp_max_c:       +avg('temp_max_c').toFixed(1),
      temp_min_c:       +avg('temp_min_c').toFixed(1),
      humedad_pct:      +avg('humedad_pct').toFixed(1),
      viento_kmh:       +avg('viento_kmh').toFixed(1),
      fase_enos:        items[Math.floor(n / 2)]?.fase_enos ?? 'Neutro',
    }
  }
  return result
}

// ─── Scale bar ────────────────────────────────────────────────────────────────

function ScaleBar({ variable, min, max }) {
  const stops = COLOR_STOPS[variable] ?? COLOR_STOPS.precipitacion_mm
  const unit  = VARIABLE_UNIT[variable] ?? ''
  const gradient = stops.map((c, i) => `rgb(${c.join(',')}) ${(i / (stops.length - 1) * 100).toFixed(0)}%`).join(', ')
  const ticks = [min, (min + max) / 2, max]
  return (
    <div className="scale-bar" style={{ padding: '4px 0 8px' }}>
      <span style={{ minWidth: 36, textAlign: 'right' }}>{min.toFixed(0)}{unit}</span>
      <div style={{ flex: 1 }}>
        <div className="scale-bar-track" style={{ background: `linear-gradient(to right, ${gradient})` }} />
        {/* <div className="scale-bar-ticks">
          {ticks.map((v, i) => (
            <span key={i}>{v.toFixed(0)}{unit}</span>
          ))}
        </div> */}
      </div>
      <span style={{ minWidth: 36 }}>{max.toFixed(0)}{unit}</span>
    </div>
  )
}

// ─── Floating tooltip ─────────────────────────────────────────────────────────

function MapTooltip({ data, name, variable, pos, containerRef }) {
  if (!data || !pos || !name) return null
  const unit = VARIABLE_UNIT[variable] ?? ''
  const containerWidth = containerRef.current?.offsetWidth ?? 800
  const flipLeft = pos.x > containerWidth * 0.65

  return (
    <div
      className="hidden md:block absolute pointer-events-none z-20 text-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-pop)',
        left: flipLeft ? pos.x - 216 : pos.x + 14,
        top: Math.max(8, pos.y - 20),
        minWidth: 200,
      }}
    >
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: REGION_COLORS[name], flexShrink: 0 }} />
        {name}
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {data.fase_enos && (
          <TooltipRow label="Fase ENOS"
            value={<span style={{ color: ENOS_COLORS[data.fase_enos] }}>{data.fase_enos}</span>} />
        )}
        <TooltipRow label={VARIABLE_LABEL[variable] ?? variable}
          value={<strong style={{ color: 'var(--text)' }}>{data[variable]?.toFixed(1)} {unit}</strong>} />
        {variable !== 'precipitacion_mm' && <TooltipRow label="Precipitación" value={`${data.precipitacion_mm?.toFixed(1)} mm`} />}
        {variable !== 'temp_media_c'     && <TooltipRow label="Temp. media"   value={`${data.temp_media_c?.toFixed(1)} °C`} />}
        <TooltipRow label="Temp. máx" value={`${data.temp_max_c?.toFixed(1)} °C`} />
        <TooltipRow label="Temp. mín" value={`${data.temp_min_c?.toFixed(1)} °C`} />
        {variable !== 'humedad_pct' && <TooltipRow label="Humedad" value={`${data.humedad_pct?.toFixed(1)} %`} />}
        <TooltipRow label="Viento" value={`${data.viento_kmh?.toFixed(1)} km/h`} />
      </div>
    </div>
  )
}

function TooltipRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostaRicaMap({
  rawRecords, source, dayRange,
  selectedYear, selectedMonths,
  variable,
  selectedDetail, onRegionClick,
}) {
  const [features,   setFeatures]   = useState([])
  const [hovered,    setHovered]    = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then(g => setFeatures((g.features ?? []).map(normalizeFeatureWinding)))
      .catch(console.error)
  }, [])

  const pathGen = useMemo(() => {
    if (!features.length) return null
    const projection = geoMercator().fitExtent(MAP_EXTENT, { type: 'FeatureCollection', features })
    return geoPath(projection)
  }, [features])

  const drawFeatures = useMemo(() => {
    if (!pathGen) return []
    return [...features].sort((a, b) => pathGen.area(b) - pathGen.area(a))
  }, [features, pathGen])

  const mapData = useMemo(
    () => buildMapData(rawRecords, source, dayRange, selectedYear, selectedMonths),
    [rawRecords, source, dayRange, selectedYear, selectedMonths],
  )

  const { min, max } = useMemo(() => {
    const vals = Object.values(mapData).map(d => d[variable]).filter(v => v != null && !isNaN(v))
    if (!vals.length) return { min: 0, max: 0 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [mapData, variable])

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleContainerLeave = useCallback(() => {
    setHovered(null)
    setTooltipPos(null)
  }, [])

  return (
    <div>
      <ScaleBar variable={variable} min={min} max={max} />

      <div
        ref={containerRef}
        style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: '#f0f9ff' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleContainerLeave}
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0c0a09" floodOpacity="0.10" />
            </filter>
            <filter id="labelShadow" x="-30%" y="-60%" width="160%" height="220%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0c0a09" floodOpacity="0.12" />
            </filter>
            <linearGradient id="regionSheen" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.06" />
            </linearGradient>
            <radialGradient id="paperGlow" cx="42%" cy="36%" r="68%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </radialGradient>
          </defs>

          <rect width={W} height={H} fill="url(#paperGlow)" />

          {pathGen && drawFeatures.map(feature => (
            <path
              key={`${feature.properties?.name}-shadow`}
              d={pathGen(feature)}
              fill="none"
              stroke="#94a3b8"
              strokeOpacity="0.4"
              strokeWidth="16"
              strokeLinejoin="round"
              filter="url(#mapShadow)"
            />
          ))}

          {pathGen && drawFeatures.map(feature => {
            const name       = feature.properties?.name
            const data       = mapData[name]
            const value      = data?.[variable]
            const fillColor  = scaleColor(value, min, max, variable)
            const isHovered  = hovered === name
            const isSelected = selectedDetail === name

            return (
              <path
                key={name}
                d={pathGen(feature)}
                fill={data ? fillColor : '#e7e5e4'}
                fillOpacity={isHovered ? 1 : 0.94}
                stroke={isSelected ? 'var(--text)' : isHovered ? 'var(--text-2)' : 'var(--surface)'}
                strokeWidth={isSelected ? 2.8 : isHovered ? 2.2 : 1.4}
                strokeDasharray={isSelected ? '6 3' : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  cursor: 'pointer',
                  transition: 'fill-opacity 0.15s',
                  filter: isHovered || isSelected ? 'drop-shadow(0 2px 4px rgba(12,10,9,0.18))' : undefined,
                }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onRegionClick(name === selectedDetail ? null : name)}
              />
            )
          })}

          {pathGen && drawFeatures.map(feature => (
            <path
              key={`${feature.properties?.name}-sheen`}
              d={pathGen(feature)}
              fill="url(#regionSheen)"
              stroke="none"
              pointerEvents="none"
            />
          ))}

          {pathGen && drawFeatures.map(feature => {
            const name = feature.properties?.name
            const [cx, cy] = pathGen.centroid(feature)
            const [dx, dy] = LABEL_OFFSETS[name] ?? [0, 0]
            const x = cx + dx
            const y = cy + dy
            const isActive = hovered === name || selectedDetail === name
            const label = REGION_LABELS[name] ?? name
            const valueText = formatMapValue(mapData[name], variable)
            const { width, height } = labelBoxSize(label, valueText)
            return (
              <g key={`${name}-label`} pointerEvents="none" filter="url(#labelShadow)">
                <rect
                  x={x - width / 2} y={y - height / 2}
                  width={width} height={height} rx="7"
                  fill={isActive ? '#ffffff' : 'rgba(255,255,255,0.86)'}
                  stroke={isActive ? '#0c0a09' : 'rgba(12,10,9,0.12)'}
                  strokeWidth={isActive ? 1.2 : 0.6}
                />
                <circle
                  cx={x - width / 2 + 10}
                  cy={valueText ? y - 7 : y}
                  r="3"
                  fill={REGION_COLORS[name] ?? '#78716c'}
                />
                <text
                  x={x + 4}
                  y={valueText ? y - 7 : y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#0c0a09"
                  fontSize={isActive ? 12.5 : 11.5}
                  fontWeight={isActive ? 700 : 600}
                >
                  {label}
                </text>
                {valueText && (
                  <text
                    x={x} y={y + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#57534e"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {valueText}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <MapTooltip
          data={hovered ? mapData[hovered] : null}
          name={hovered}
          variable={variable}
          pos={tooltipPos}
          containerRef={containerRef}
        />

        {Object.keys(mapData).length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin datos para los filtros seleccionados</p>
          </div>
        )}
      </div>

      {/* Region legend */}
      <div className="map-legend">
        {Object.entries(REGION_COLORS).map(([name, rColor]) => {
          const value = mapData[name]?.[variable]
          const unit  = VARIABLE_UNIT[variable] ?? ''
          return (
            <button
              key={name}
              className="map-legend-item"
              style={{ '--c': rColor, cursor: 'pointer', background: selectedDetail === name ? 'var(--surface-2)' : 'transparent', borderRadius: 6, padding: '4px 6px', width: '100%', textAlign: 'left', border: 'none' }}
              onClick={() => onRegionClick(name === selectedDetail ? null : name)}
            >
              <span className="dot" />
              <span className="label" style={{ fontSize: 11.5 }}>{name} {value != null && `(${value.toFixed(1)}${unit})`}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
