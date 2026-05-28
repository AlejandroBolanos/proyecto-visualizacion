import {
  ComposedChart, Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea, LabelList,
} from 'recharts'
import { useMemo } from 'react'
import { REGION_COLORS } from './RegionFilter'
import TooltipCustom from './TooltipCustom'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENOS_FILL = {
  'El Niño': '#f97316',
  'La Niña': '#3b82f6',
  'Neutro':  '#6b7280',
}

export const MES_NOMBRES = {
  1:'Ene', 2:'Feb', 3:'Mar', 4:'Abr',
  5:'May', 6:'Jun', 7:'Jul', 8:'Ago',
  9:'Set', 10:'Oct', 11:'Nov', 12:'Dic',
}

const VARIABLE_LABEL = {
  precipitacion_mm: 'Precipitación (mm)',
  temp_media_c:     'Temperatura media (°C)',
  humedad_pct:      'Humedad (%)',
}

// safe SVG gradient ID (no accents, no spaces)
const gradId = (name) => `grad-${name.replace(/[^a-zA-Z0-9]/g, '_')}`

// ─── Shared aggregation (exported so CostaRicaMap can reuse) ─────────────────

export function aggregateToMonthly(dailyRecords) {
  const acc = {}
  for (const d of dailyRecords) {
    const key = `${d.region}|${d.año}|${d.mes}`
    if (!acc[key]) {
      acc[key] = {
        region: d.region, año: d.año, mes: d.mes,
        mes_nombre: MES_NOMBRES[d.mes] ?? String(d.mes),
        fase_enos: d.fase_enos, _items: [],
      }
    }
    acc[key]._items.push(d)
  }
  return Object.values(acc).map(({ _items, ...rest }) => {
    const n   = _items.length
    const sum = (c) => _items.reduce((s, d) => s + (d[c] ?? 0), 0)
    const avg = (c) => sum(c) / n
    const counts = {}
    for (const d of _items) counts[d.fase_enos] = (counts[d.fase_enos] ?? 0) + 1
    return {
      ...rest,
      fase_enos:        Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      precipitacion_mm: +sum('precipitacion_mm').toFixed(1),
      temp_media_c:     +avg('temp_media_c').toFixed(1),
      temp_max_c:       +avg('temp_max_c').toFixed(1),
      temp_min_c:       +avg('temp_min_c').toFixed(1),
      humedad_pct:      +avg('humedad_pct').toFixed(1),
      viento_kmh:       +avg('viento_kmh').toFixed(1),
    }
  })
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function toMonthly(rawRecords, source, dayRange) {
  if (source !== 'daily') return rawRecords
  const { from, to } = dayRange
  const filtered = (from === 1 && to === 31)
    ? rawRecords
    : rawRecords.filter((d) => d.dia >= from && d.dia <= to)
  return aggregateToMonthly(filtered)
}

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildOverviewData(rawRecords, source, dayRange, selectedRegions, selectedYear, selectedMonths, variable) {
  const monthly = toMonthly(rawRecords, source, dayRange)
  let data = monthly.filter((d) => selectedRegions.includes(d.region))
  if (selectedYear !== 'all') data = data.filter((d) => d.año === selectedYear)
  if (selectedMonths.length < 12) data = data.filter((d) => selectedMonths.includes(d.mes))

  const acc = {}
  for (const d of data) {
    const k = d.mes
    if (!acc[k]) acc[k] = { mes: d.mes, mes_nombre: d.mes_nombre ?? MES_NOMBRES[d.mes], fase_enos: d.fase_enos, _r: {}, _t: {} }
    ;(acc[k]._r[d.region] ??= []).push(d[variable] ?? 0)
    ;(acc[k]._t[d.region] ??= []).push(d.temp_media_c ?? 0)
  }

  return Object.values(acc).sort((a, b) => a.mes - b.mes).map(({ _r, _t, ...rest }) => {
    const row = { ...rest }
    const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
    for (const [r, vals] of Object.entries(_r)) row[r] = +mean(vals).toFixed(1)
    for (const [r, vals] of Object.entries(_t)) row[`${r}__temp`] = +mean(vals).toFixed(1)
    return row
  })
}

function buildDetailData(rawRecords, source, dayRange, region, selectedYear, selectedMonths) {
  const monthly = toMonthly(rawRecords, source, dayRange)
  let data = monthly.filter((d) => d.region === region)
  if (selectedYear !== 'all') data = data.filter((d) => d.año === selectedYear)
  if (selectedMonths.length < 12) data = data.filter((d) => selectedMonths.includes(d.mes))

  if (selectedYear === 'all') {
    const acc = {}
    for (const d of data) {
      const k = d.mes
      if (!acc[k]) acc[k] = { mes: d.mes, mes_nombre: d.mes_nombre ?? MES_NOMBRES[d.mes], fase_enos: d.fase_enos, items: [] }
      acc[k].items.push(d)
    }
    return Object.values(acc).sort((a, b) => a.mes - b.mes).map(({ items, ...rest }) => {
      const n = items.length
      const avg = (c) => items.reduce((s, d) => s + (d[c] ?? 0), 0) / n
      return { ...rest, precipitacion_mm: +avg('precipitacion_mm').toFixed(1), temp_media_c: +avg('temp_media_c').toFixed(1), temp_max_c: +avg('temp_max_c').toFixed(1), temp_min_c: +avg('temp_min_c').toFixed(1), humedad_pct: +avg('humedad_pct').toFixed(1), viento_kmh: +avg('viento_kmh').toFixed(1) }
    })
  }
  return [...data].sort((a, b) => a.mes - b.mes)
}

// ─── Shared SVG components ────────────────────────────────────────────────────

function EnosAreas({ data }) {
  return data.map((d) => (
    <ReferenceArea key={`enos-${d.mes}`} x1={d.mes_nombre} x2={d.mes_nombre}
      fill={ENOS_FILL[d.fase_enos] ?? '#6b7280'} fillOpacity={0.08} ifOverflow="visible" />
  ))
}

function subtitleFromFilters(selectedYear, selectedMonths, source, dayRange) {
  const parts = []
  if (selectedYear !== 'all') parts.push(selectedYear)
  if (selectedMonths.length < 12) parts.push(selectedMonths.map((m) => MES_NOMBRES[m]).join(', '))
  if (source === 'daily' && (dayRange.from !== 1 || dayRange.to !== 31))
    parts.push(`días ${dayRange.from}–${dayRange.to}`)
  return parts.join(' · ')
}

// ─── OverviewChart ────────────────────────────────────────────────────────────

export function OverviewChart({ rawRecords, source, dayRange, selectedRegions, selectedYear, selectedMonths, variable, chartType }) {
  const chartData = useMemo(
    () => buildOverviewData(rawRecords, source, dayRange, selectedRegions, selectedYear, selectedMonths, variable),
    [rawRecords, source, dayRange, selectedRegions, selectedYear, selectedMonths, variable],
  )

  const subtitle = subtitleFromFilters(selectedYear, selectedMonths, source, dayRange)

  function renderSeries() {
    return selectedRegions.map((region) => {
      const color = REGION_COLORS[region]
      const gId   = gradId(region)

      if (chartType === 'area') {
        return (
          <Area key={region} type="monotone" dataKey={region}
            stroke={color} strokeWidth={2}
            fill={`url(#${gId})`}
            dot={false} activeDot={{ r: 4 }} />
        )
      }
      if (chartType === 'line') {
        return (
          <Line key={region} type="monotone" dataKey={region}
            stroke={color} strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        )
      }
      return (
        <Bar key={region} dataKey={region} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28}>
          <LabelList dataKey={region} position="top" content={({ x, y, width, value }) => {
            if (!value || value <= 50) return null
            return <text x={(x ?? 0) + (width ?? 0) / 2} y={(y ?? 0) - 4}
              textAnchor="middle" fill="#94a3b8" fontSize={9}>{Number(value).toFixed(0)}</text>
          }} />
        </Bar>
      )
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-0.5">
        Vista general — {VARIABLE_LABEL[variable] ?? variable}
      </h2>
      {subtitle && <p className="text-xs text-slate-500 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      <div className="chart-fade" key={`${chartType}-${source}-${selectedMonths.join()}-${dayRange.from}-${dayRange.to}`}>
        <div className="h-56 sm:h-72 md:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 0, left: 8 }}>
            {/* Inline defs so Recharts renders gradients into the SVG */}
            <defs>
              {selectedRegions.map((r) => (
                <linearGradient key={r} id={gradId(r)} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={REGION_COLORS[r]} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={REGION_COLORS[r]} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <EnosAreas data={chartData} />
            <XAxis dataKey="mes_nombre" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={(props) => <TooltipCustom {...props} mode="overview" variable={variable} />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(v) => <span style={{ color: REGION_COLORS[v] ?? '#94a3b8' }}>{v}</span>} />
            {renderSeries()}
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── DetailChart ──────────────────────────────────────────────────────────────

export function DetailChart({ rawRecords, source, dayRange, region, selectedYear, selectedMonths, chartType }) {
  const chartData = useMemo(
    () => buildDetailData(rawRecords, source, dayRange, region, selectedYear, selectedMonths),
    [rawRecords, source, dayRange, region, selectedYear, selectedMonths],
  )

  const color    = REGION_COLORS[region] ?? '#60a5fa'
  const gId      = gradId(region)
  const subtitle = subtitleFromFilters(
    selectedYear === 'all' ? 'all' : selectedYear,
    selectedMonths, source, dayRange,
  ) || (selectedYear === 'all' ? 'promedio 2020–2025' : String(selectedYear))

  function renderPrecip() {
    if (chartType === 'area') {
      return <Area yAxisId="prec" type="monotone" dataKey="precipitacion_mm" name="Precipitación (mm)"
        stroke={color} strokeWidth={2} fill={`url(#${gId})`} dot={false} activeDot={{ r: 4 }} />
    }
    if (chartType === 'line') {
      return <Line yAxisId="prec" type="monotone" dataKey="precipitacion_mm" name="Precipitación (mm)"
        stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
    }
    return <Bar yAxisId="prec" dataKey="precipitacion_mm" name="Precipitación (mm)"
      fill={color} fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={36} />
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-0.5">
        Detalle — <span style={{ color }}>{region}</span>
      </h2>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      <div className="chart-fade" key={`${chartType}-${source}-${selectedMonths.join()}-${dayRange.from}-${dayRange.to}`}>
        <div className="h-52 sm:h-[280px] md:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.45} />
                <stop offset="95%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <EnosAreas data={chartData} />
            <XAxis dataKey="mes_nombre" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
            <YAxis yAxisId="prec" orientation="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={50}
              label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dy: 20 }} />
            <YAxis yAxisId="temp" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={40}
              label={{ value: '°C', position: 'insideRight', fill: '#64748b', fontSize: 11, dy: -10 }} />
            <Tooltip content={<TooltipCustom />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }} />
            {renderPrecip()}
            <Line yAxisId="temp" type="monotone" dataKey="temp_media_c" name="Temp. media (°C)"
              stroke="#f8fafc" strokeWidth={2} dot={{ r: 3, fill: '#f8fafc', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
