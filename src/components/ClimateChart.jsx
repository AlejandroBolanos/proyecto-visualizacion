import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { useMemo } from 'react'
import { REGION_COLORS } from './RegionFilter'
import TooltipCustom from './TooltipCustom'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

const ENOS_BG = {
  'El Niño': 'rgba(251,146,60,0.10)',
  'La Niña': 'rgba(96,165,250,0.10)',
  'Neutro':  'rgba(148,163,184,0.06)',
}

/** Build reference areas from consecutive same-phase months */
function buildEnosAreas(data) {
  if (!data.length) return []
  const areas = []
  let start = 0
  let currentFase = data[0].fase_enos
  for (let i = 1; i <= data.length; i++) {
    const fase = data[i]?.fase_enos
    if (fase !== currentFase || i === data.length) {
      areas.push({ fase: currentFase, x1: data[start].mes_nombre, x2: data[i - 1].mes_nombre })
      start = i
      currentFase = fase
    }
  }
  return areas
}

/** Aggregate data by mes when showing all years (average) */
function aggregate(data) {
  const byMes = {}
  for (const d of data) {
    const key = d.mes
    if (!byMes[key]) byMes[key] = { mes: d.mes, mes_nombre: d.mes_nombre, items: [] }
    byMes[key].items.push(d)
  }
  return Object.values(byMes)
    .sort((a, b) => a.mes - b.mes)
    .map(({ mes, mes_nombre, items }) => {
      const avg = (col) => items.reduce((s, d) => s + d[col], 0) / items.length
      return {
        mes,
        mes_nombre,
        precipitacion_mm: +avg('precipitacion_mm').toFixed(1),
        temp_media_c:     +avg('temp_media_c').toFixed(1),
        temp_max_c:       +avg('temp_max_c').toFixed(1),
        temp_min_c:       +avg('temp_min_c').toFixed(1),
        humedad_pct:      +avg('humedad_pct').toFixed(1),
        viento_kmh:       +avg('viento_kmh').toFixed(1),
        fase_enos: items[Math.floor(items.length / 2)].fase_enos,
      }
    })
}

/** OverviewChart — grouped/stacked bars with ENOS background */
export function OverviewChart({ rawData, selectedRegions, selectedYear, variable }) {
  const chartData = useMemo(() => {
    const filtered = rawData.filter((d) => selectedRegions.includes(d.region))
    const byYearFiltered = selectedYear === 'all'
      ? filtered
      : filtered.filter((d) => d.año === selectedYear)

    // Pivot: one row per month, one prop per region
    const byMes = {}
    for (const d of byYearFiltered) {
      const key = d.mes
      if (!byMes[key]) byMes[key] = { mes: d.mes, mes_nombre: d.mes_nombre, fase_enos: d.fase_enos }
      byMes[key][d.region] = +(d[variable] ?? 0)
    }
    return Object.values(byMes).sort((a, b) => a.mes - b.mes)
  }, [rawData, selectedRegions, selectedYear, variable])

  const enosAreas = useMemo(() => buildEnosAreas(chartData), [chartData])

  const variableLabel = {
    precipitacion_mm: 'Precipitación (mm)',
    temp_media_c: 'Temperatura media (°C)',
    humedad_pct: 'Humedad (%)',
  }[variable]

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Vista general — {variableLabel}
        {selectedYear !== 'all' && <span className="ml-2 text-slate-400 font-normal">· {selectedYear}</span>}
      </h2>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          {enosAreas.map((a, i) => (
            <ReferenceArea
              key={i}
              x1={a.x1}
              x2={a.x2}
              fill={ENOS_BG[a.fase] ?? 'transparent'}
              ifOverflow="visible"
            />
          ))}
          <XAxis
            dataKey="mes_nombre"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
            formatter={(v) => <span style={{ color: REGION_COLORS[v] ?? '#94a3b8' }}>{v}</span>}
          />
          {selectedRegions.map((region) => (
            <Bar
              key={region}
              dataKey={region}
              fill={REGION_COLORS[region]}
              radius={[3, 3, 0, 0]}
              maxBarSize={30}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** DetailChart — ComposedChart for a single region */
export function DetailChart({ rawData, region, selectedYear }) {
  const chartData = useMemo(() => {
    const filtered = rawData.filter((d) => d.region === region)
    const byYear = selectedYear === 'all'
      ? filtered
      : filtered.filter((d) => d.año === selectedYear)
    return selectedYear === 'all' ? aggregate(byYear) : byYear.sort((a, b) => a.mes - b.mes)
  }, [rawData, region, selectedYear])

  const enosAreas = useMemo(() => buildEnosAreas(chartData), [chartData])
  const color = REGION_COLORS[region] ?? '#60a5fa'

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-200 mb-1">
        Detalle — <span style={{ color }}>{region}</span>
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Barras: precipitación (mm) · Línea: temperatura media (°C)
        {selectedYear !== 'all' && ` · ${selectedYear}`}
        {selectedYear === 'all' && ' · promedio 2020–2024'}
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 48, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          {enosAreas.map((a, i) => (
            <ReferenceArea
              key={i}
              x1={a.x1}
              x2={a.x2}
              fill={ENOS_BG[a.fase] ?? 'transparent'}
              ifOverflow="visible"
            />
          ))}
          <XAxis
            dataKey="mes_nombre"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="prec"
            orientation="left"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={50}
            label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dy: 20 }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={{ value: '°C', position: 'insideRight', fill: '#64748b', fontSize: 11, dy: -10 }}
          />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
          />
          <Bar
            yAxisId="prec"
            dataKey="precipitacion_mm"
            name="Precipitación (mm)"
            fill={color}
            fillOpacity={0.75}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
          />
          <Line
            yAxisId="temp"
            dataKey="temp_media_c"
            name="Temp. media (°C)"
            stroke="#f8fafc"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f8fafc', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
