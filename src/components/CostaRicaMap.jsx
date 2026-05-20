import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { geoArea, geoMercator, geoPath } from 'd3-geo'
import { REGION_COLORS } from './RegionFilter'
import { aggregateToMonthly, MES_NOMBRES } from './ClimateChart'

const GEO_URL = '/data/cr_zones.geojson'

const W = 800
const H = 480
const MAP_EXTENT = [[70, 28], [730, 452]]

const REGION_LABELS = {
  'Pac\u00edfico Norte': 'Pac. Norte',
  'Pac\u00edfico Central': 'Pac. Central',
  'Pac\u00edfico Sur': 'Pac. Sur',
  'Valle Central': 'Valle Central',
  'Zona Norte': 'Zona Norte',
  'Caribe Norte': 'Caribe Norte',
  'Caribe Sur': 'Caribe Sur',
}

const LABEL_OFFSETS = {
  'Pac\u00edfico Norte': [-16, 0],
  'Zona Norte': [8, -4],
  'Caribe Norte': [16, -2],
  'Valle Central': [2, 4],
  'Pac\u00edfico Central': [12, -4],
  'Caribe Sur': [18, 0],
  'Pac\u00edfico Sur': [-10, 14],
}

function normalizeFeatureWinding(feature) {
  if (!feature?.geometry || geoArea(feature) <= 1) return feature

  const clone = structuredClone(feature)
  if (clone.geometry.type === 'Polygon') {
    clone.geometry.coordinates = clone.geometry.coordinates.map((ring) => [...ring].reverse())
  } else if (clone.geometry.type === 'MultiPolygon') {
    clone.geometry.coordinates = clone.geometry.coordinates.map((polygon) =>
      polygon.map((ring) => [...ring].reverse()),
    )
  }
  return clone
}

// ─── Color scales ─────────────────────────────────────────────────────────────

const COLOR_SCALES = {
  precipitacion_mm: { from: [219, 234, 254], to: [30, 64, 175]  },
  temp_media_c:     { from: [254, 249, 195], to: [185, 28,  28] },
  humedad_pct:      { from: [209, 250, 229], to: [6,   95,  70] },
}

const VARIABLE_LABEL = {
  precipitacion_mm: 'Precipitación (mm)',
  temp_media_c:     'Temp. media (°C)',
  humedad_pct:      'Humedad (%)',
}
const VARIABLE_UNIT = { precipitacion_mm: 'mm', temp_media_c: '°C', humedad_pct: '%' }
const ENOS_COLORS   = { 'El Niño': '#fb923c', 'La Niña': '#60a5fa', 'Neutro': '#94a3b8' }

function lerp(a, b, t) { return Math.round(a + (b - a) * t) }

function scaleColor(value, min, max, variable) {
  if (value == null || isNaN(value)) return '#1e293b'
  const sc = COLOR_SCALES[variable] ?? COLOR_SCALES.precipitacion_mm
  const t  = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  return `rgb(${lerp(sc.from[0], sc.to[0], t)},${lerp(sc.from[1], sc.to[1], t)},${lerp(sc.from[2], sc.to[2], t)})`
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
    if (from !== 1 || to !== 31) data = data.filter((d) => d.dia >= from && d.dia <= to)
    data = aggregateToMonthly(data)
  }
  if (selectedYear !== 'all') data = data.filter((d) => d.año === selectedYear)
  if (selectedMonths.length < 12) data = data.filter((d) => selectedMonths.includes(d.mes))

  const byRegion = {}
  for (const d of data) (byRegion[d.region] ??= []).push(d)

  const result = {}
  for (const [region, items] of Object.entries(byRegion)) {
    const n   = items.length
    const avg = (c) => items.reduce((s, d) => s + (d[c] ?? 0), 0) / n
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

// ─── Color legend bar ─────────────────────────────────────────────────────────

function ColorLegend({ variable, min, max }) {
  const sc   = COLOR_SCALES[variable] ?? COLOR_SCALES.precipitacion_mm
  const unit = VARIABLE_UNIT[variable] ?? ''
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500 tabular-nums w-12 text-right">
        {min.toFixed(1)}{unit}
      </span>
      <div
        className="flex-1 h-2.5 rounded-full"
        style={{ background: `linear-gradient(to right, rgb(${sc.from.join(',')}), rgb(${sc.to.join(',')}))` }}
      />
      <span className="text-xs text-slate-500 tabular-nums w-12">
        {max.toFixed(1)}{unit}
      </span>
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
      className="absolute pointer-events-none z-20 rounded-xl border border-slate-600 shadow-2xl text-xs"
      style={{ background: '#1e293b', left: flipLeft ? pos.x - 210 : pos.x + 14, top: Math.max(8, pos.y - 20), minWidth: 200 }}
    >
      <div className="px-4 py-2 border-b border-slate-700 font-semibold flex items-center gap-2"
        style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[name] }} />
        <span className="text-slate-200">{name}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {data.fase_enos && (
          <Row label="Fase ENOS"
            value={<span style={{ color: ENOS_COLORS[data.fase_enos] }}>{data.fase_enos}</span>} />
        )}
        <Row label={VARIABLE_LABEL[variable] ?? variable}
          value={<span className="font-bold text-white">{data[variable]?.toFixed(1)} {unit}</span>} />
        {variable !== 'precipitacion_mm' && <Row label="Precipitación" value={`${data.precipitacion_mm?.toFixed(1)} mm`} />}
        {variable !== 'temp_media_c'     && <Row label="Temp. media"   value={`${data.temp_media_c?.toFixed(1)} °C`} />}
        <Row label="Temp. máx" value={`${data.temp_max_c?.toFixed(1)} °C`} />
        <Row label="Temp. mín" value={`${data.temp_min_c?.toFixed(1)} °C`} />
        {variable !== 'humedad_pct' && <Row label="Humedad" value={`${data.humedad_pct?.toFixed(1)} %`} />}
        <Row label="Viento" value={`${data.viento_kmh?.toFixed(1)} km/h`} />
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
      .then((r) => r.json())
      .then((g) => setFeatures((g.features ?? []).map(normalizeFeatureWinding)))
      .catch(console.error)
  }, [])

  const pathGen = useMemo(() => {
    if (!features.length) return null
    const projection = geoMercator().fitExtent(MAP_EXTENT, {
      type: 'FeatureCollection',
      features,
    })
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
    const vals = Object.values(mapData).map((d) => d[variable]).filter((v) => v != null && !isNaN(v))
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

  const filterParts = []
  if (selectedYear !== 'all') filterParts.push(selectedYear)
  else filterParts.push('promedio 2020–2025')
  if (selectedMonths.length < 12) filterParts.push(selectedMonths.map((m) => MES_NOMBRES[m]).join(', '))
  if (source === 'daily' && (dayRange.from !== 1 || dayRange.to !== 31))
    filterParts.push(`días ${dayRange.from}–${dayRange.to}`)

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            Mapa climático — {VARIABLE_LABEL[variable] ?? variable}
          </h2>
          <p className="text-xs text-slate-500">{filterParts.join(' · ')}</p>
        </div>
        <p className="text-xs text-slate-600 mt-1">Clic en una región → gráfico detallado</p>
      </div>

      <ColorLegend variable={variable} min={min} max={max} />

      <div
        ref={containerRef}
        className="relative mt-3 rounded-xl overflow-hidden border border-slate-700/70"
        style={{ background: '#f8fafc' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleContainerLeave}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.18" />
            </filter>
            <filter id="labelShadow" x="-30%" y="-60%" width="160%" height="220%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.22" />
            </filter>
            <linearGradient id="regionSheen" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.12" />
            </linearGradient>
            <radialGradient id="paperGlow" cx="42%" cy="36%" r="68%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e8eef6" />
            </radialGradient>
          </defs>

          <rect width={W} height={H} fill="url(#paperGlow)" />
          <path d="M0 382 C145 354 242 382 376 352 S617 335 800 366 L800 480 L0 480 Z" fill="#dbe7f3" opacity="0.36" />
          <path d="M0 72 C116 96 222 76 342 96 S548 130 800 84" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.42" />
          <path d="M0 116 C148 142 252 112 382 136 S594 168 800 122" fill="none" stroke="#d7dee8" strokeWidth="1" opacity="0.55" />

          {pathGen && drawFeatures.map((feature) => (
            <path
              key={`${feature.properties?.name}-shadow`}
              d={pathGen(feature)}
              fill="none"
              stroke="#9aa9bc"
              strokeOpacity="0.72"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#mapShadow)"
            />
          ))}

          {pathGen && drawFeatures.map((feature) => {
            const name       = feature.properties?.name
            const data       = mapData[name]
            const value      = data?.[variable]
            const fillColor  = scaleColor(value, min, max, variable)
            const isHovered  = hovered === name
            const isSelected = selectedDetail === name
            const rColor     = REGION_COLORS[name] ?? '#94a3b8'
            const d          = pathGen(feature)

            return (
              <path
                key={name}
                d={d}
                fill={data ? fillColor : '#1e293b'}
                fillOpacity={isHovered ? 1 : 0.96}
                stroke={isSelected ? '#020617' : isHovered ? '#020617' : '#172033'}
                strokeOpacity={isSelected || isHovered ? 1 : 0.88}
                strokeWidth={isSelected ? 3.2 : isHovered ? 2.6 : 1.8}
                strokeDasharray={isSelected ? '6 3' : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  cursor: 'pointer',
                  transition: 'fill-opacity 0.15s, stroke-opacity 0.15s',
                  filter: isHovered || isSelected ? 'drop-shadow(0 3px 6px rgba(15,23,42,0.25))' : undefined,
                }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onRegionClick(name === selectedDetail ? null : name)}
              />
            )
          })}

          {pathGen && drawFeatures.map((feature) => (
            <path
              key={`${feature.properties?.name}-sheen`}
              d={pathGen(feature)}
              fill="url(#regionSheen)"
              stroke="#ffffff"
              strokeOpacity="0.22"
              strokeWidth="1"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}

          {pathGen && drawFeatures.map((feature) => (
            <path
              key={`${feature.properties?.name}-outline`}
              d={pathGen(feature)}
              fill="none"
              stroke="#111827"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}

          {pathGen && drawFeatures.map((feature) => {
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
              <g
                key={`${name}-label`}
                pointerEvents="none"
                opacity={isActive ? 1 : 0.92}
                filter="url(#labelShadow)"
              >
                <rect
                  x={x - width / 2}
                  y={y - height / 2}
                  width={width}
                  height={height}
                  rx="7"
                  fill={isActive ? '#ffffff' : 'rgba(255,255,255,0.82)'}
                  stroke={isActive ? '#0f172a' : 'rgba(15,23,42,0.16)'}
                  strokeWidth={isActive ? 1.4 : 0.8}
                />
                <circle
                  cx={x - width / 2 + 10}
                  cy={valueText ? y - 7 : y}
                  r="3"
                  fill={REGION_COLORS[name] ?? '#64748b'}
                />
                <text
                  x={x + 4}
                  y={valueText ? y - 7 : y + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#111827"
                  fontSize={isActive ? 12.5 : 11.5}
                  fontWeight={isActive ? 700 : 600}
                >
                  {label}
                </text>
                {valueText && (
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#475569"
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
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-500 text-sm">Sin datos para los filtros seleccionados</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-x-3 gap-y-1.5">
        {Object.entries(REGION_COLORS).map(([name, rColor]) => {
          const value = mapData[name]?.[variable]
          const unit  = VARIABLE_UNIT[variable] ?? ''
          return (
            <button
              key={name}
              onClick={() => onRegionClick(name === selectedDetail ? null : name)}
              className={`flex items-center gap-1.5 text-left px-2 py-1.5 rounded-lg transition-colors text-xs ${
                selectedDetail === name ? 'bg-slate-700 ring-1 ring-slate-500' : 'hover:bg-slate-700/60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rColor }} />
              <span className="text-slate-300 truncate">{name}</span>
              {value != null && (
                <span className="ml-auto text-slate-400 tabular-nums flex-shrink-0 font-medium">
                  {value.toFixed(1)}{unit}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
