import { useState, useRef, useEffect, useMemo } from 'react'
import { useClimateData } from './hooks/useClimateData'
import RegionFilter, { REGION_COLORS } from './components/RegionFilter'
import { OverviewChart, DetailChart } from './components/ClimateChart'
import CostaRicaMap from './components/CostaRicaMap'
import Icon from './components/Icon'

const ALL_REGIONS = Object.keys(REGION_COLORS)

const VARIABLE_META = {
  precipitacion_mm: { name: 'Precipitación', short: 'Prec.', unit: 'mm' },
  temp_media_c:     { name: 'Temperatura media', short: 'Temp.', unit: '°C' },
  humedad_pct:      { name: 'Humedad relativa', short: 'Hum.', unit: '%' },
}

const MES_ABREV = { 1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Oct',11:'Nov',12:'Dic' }

const ENOS_CONFIG = [
  { key: 'nino',    label: 'El Niño', color: 'var(--enos-nino)' },
  { key: 'nina',    label: 'La Niña', color: 'var(--enos-nina)' },
  { key: 'neutral', label: 'Neutro',  color: 'var(--enos-neutral)' },
]
const ENOS_LABELS = { nino: 'El Niño', nina: 'La Niña', neutral: 'Neutro' }

export default function App() {
  const now = new Date()

  const [dataSource,      setDataSource]      = useState('monthly')
  const [chartType,       setChartType]       = useState('bar')
  const [selectedRegions, setSelectedRegions] = useState([...ALL_REGIONS])
  const [selectedYear,    setSelectedYear]    = useState('all')
  const [variable,        setVariable]        = useState('precipitacion_mm')
  const [detailRegion,    setDetailRegion]    = useState(null)
  const [selectedMonths,  setSelectedMonths]  = useState([now.getMonth() + 1])
  const [dayRange,        setDayRange]        = useState({ from: 1, to: 31 })
  const [viewMode,        setViewMode]        = useState('charts')
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [enosFilter,      setEnosFilter]      = useState({ nino: true, nina: true, neutral: true })

  const detailRef = useRef(null)

  const { rawRecords, loading, error, years } = useClimateData(dataSource)

  // Dominant ENOS phase per month (1-12) from rawRecords
  const enosByMonth = useMemo(() => {
    let records = selectedYear !== 'all'
      ? rawRecords.filter(d => d.año === selectedYear)
      : rawRecords
    const counts = {}
    for (const d of records) {
      const m = d.mes
      const phase = d.fase_enos === 'El Niño' ? 'nino' : d.fase_enos === 'La Niña' ? 'nina' : 'neutral'
      if (!counts[m]) counts[m] = { nino: 0, nina: 0, neutral: 0 }
      counts[m][phase]++
    }
    const result = {}
    for (let m = 1; m <= 12; m++) {
      if (counts[m]) {
        result[m] = Object.entries(counts[m]).sort((a, b) => b[1] - a[1])[0][0]
      } else {
        result[m] = 'neutral'
      }
    }
    return result
  }, [rawRecords, selectedYear])

  // selectedMonths filtered by ENOS toggles
  const effectiveMonths = useMemo(
    () => selectedMonths.filter(m => enosFilter[enosByMonth[m] ?? 'neutral']),
    [selectedMonths, enosFilter, enosByMonth]
  )

  // KPI values derived from rawRecords
  const kpis = useMemo(() => {
    if (!rawRecords.length || !selectedRegions.length || !effectiveMonths.length) return null
    let records = rawRecords
    if (selectedYear !== 'all') records = records.filter(d => d.año === selectedYear)
    records = records.filter(d => effectiveMonths.includes(d.mes) && selectedRegions.includes(d.region))
    if (dataSource === 'daily') records = records.filter(d => d.dia >= dayRange.from && d.dia <= dayRange.to)
    if (!records.length) return null

    const vals = records.map(d => d[variable] ?? 0).filter(v => !isNaN(v))
    if (!vals.length) return null

    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const max = Math.max(...vals)
    const min = Math.min(...vals)

    const regionAvgs = {}
    for (const r of selectedRegions) {
      const rv = records.filter(d => d.region === r).map(d => d[variable] ?? 0)
      regionAvgs[r] = rv.length ? rv.reduce((a, b) => a + b, 0) / rv.length : 0
    }
    const bestRegion = Object.entries(regionAvgs).sort((a, b) => b[1] - a[1])[0]?.[0]

    const enosCounts = { nino: 0, nina: 0, neutral: 0 }
    effectiveMonths.forEach(m => enosCounts[enosByMonth[m] ?? 'neutral']++)
    const dominantPhase = Object.entries(enosCounts).sort((a, b) => b[1] - a[1])[0][0]

    return { avg, max, min, bestRegion, dominantPhase }
  }, [rawRecords, selectedYear, effectiveMonths, selectedRegions, variable, dataSource, dayRange, enosByMonth])

  // Auto-scroll al gráfico detallado en móvil al seleccionar una región
  useEffect(() => {
    if (!detailRegion) return
    if (window.innerWidth >= 960) return
    const timer = setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(timer)
  }, [detailRegion])

  function handleToggleRegion(region, mode) {
    if (mode === 'all')  { setSelectedRegions([...ALL_REGIONS]); return }
    if (mode === 'none') { setSelectedRegions([]); return }
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    )
  }

  function handleDataSourceChange(src) {
    setDataSource(src)
    setSelectedYear('all')
    if (src === 'monthly') {
      setDayRange({ from: 1, to: 31 })
    } else {
      const d = new Date().getDate()
      setDayRange({ from: d, to: d })
    }
  }

  const filterProps = {
    dataSource,       onDataSourceChange: handleDataSourceChange,
    chartType,        onChartTypeChange:  setChartType,
    variable,         onVariableChange:   setVariable,
    years,            selectedYear,       onYearChange:       setSelectedYear,
    selectedMonths,   onMonthsChange:     setSelectedMonths,
    dayRange,         onDayRangeChange:   setDayRange,
    selectedRegions,  onToggleRegion:     handleToggleRegion,
    selectedDetail:   detailRegion,       onDetailChange:     setDetailRegion,
    onNearestRegions: setSelectedRegions,
    onClose:          () => setSidebarOpen(false),
  }

  const varMeta = VARIABLE_META[variable] ?? { name: variable, short: variable, unit: '' }

  function fmtV(v) {
    if (variable === 'precipitacion_mm') return `${Math.round(v)} ${varMeta.unit}`
    if (variable === 'temp_media_c')     return `${v.toFixed(1)} ${varMeta.unit}`
    return `${Math.round(v)}${varMeta.unit}`
  }

  const monthLabel = effectiveMonths.map(m => MES_ABREV[m]).join(', ') || 'Sin meses'
  const yearLabel  = selectedYear === 'all' ? 'Prom. 2020–2025' : `Año ${selectedYear}`

  return (
    <div className="app">
      {/* Mobile scrim */}
      <div className="sidebar-scrim" data-open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className="sidebar" data-open={sidebarOpen}>
        <RegionFilter {...filterProps} />
      </aside>

      {/* Main */}
      <main className="main">

        {/* ── Topbar ── */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Filtros">
              <Icon name="menu" />
            </button>
            <h1 className="page-title">
              Visualización Climática <small>· Costa Rica</small>
            </h1>
          </div>

          {/* ENOS filter chips */}
          <div className="enos">
            <span className="enos-label">Fase ENOS</span>
            <span className="enos-chips">
              {ENOS_CONFIG.map(({ key, label, color }) => (
                <button
                  key={key}
                  className="enos-chip"
                  data-active={enosFilter[key]}
                  onClick={() => setEnosFilter(f => ({ ...f, [key]: !f[key] }))}
                >
                  <span className="enos-dot" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </span>
          </div>

          {/* View toggle */}
          <div className="seg" style={{ width: 180 }}>
            <button data-active={viewMode === 'charts'} onClick={() => setViewMode('charts')}>
              <Icon name="chart" size={13} /> Gráficos
            </button>
            <button data-active={viewMode === 'map'} onClick={() => setViewMode('map')}>
              <Icon name="map" size={13} /> Mapa
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Cargando datos climáticos…</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, padding: 24 }}>
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12, padding: '20px 24px', maxWidth: 400, textAlign: 'center', color: '#dc2626' }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Error al cargar datos</p>
              <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <div className="content">

            {/* KPI strip */}
            {kpis && (
              <div className="kpis">
                <div className="kpi">
                  <div className="kpi-label">Promedio · {varMeta.short}</div>
                  <div className="kpi-value">{fmtV(kpis.avg)}</div>
                  <div className="kpi-delta">
                    {selectedRegions.length} {selectedRegions.length === 1 ? 'región' : 'regiones'} · {effectiveMonths.length} {effectiveMonths.length === 1 ? 'mes' : 'meses'}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Máximo registrado</div>
                  <div className="kpi-value">{fmtV(kpis.max)}</div>
                  <div className="kpi-delta">
                    {kpis.bestRegion
                      ? <><span className="kpi-dot" style={{ '--c': REGION_COLORS[kpis.bestRegion] }} />{kpis.bestRegion}</>
                      : '—'}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Mínimo registrado</div>
                  <div className="kpi-value">{fmtV(kpis.min)}</div>
                  <div className="kpi-delta">{yearLabel}</div>
                </div>
                <div className="kpi" style={{ '--c': `var(--enos-${kpis.dominantPhase})` }}>
                  <div className="kpi-label"><span className="kpi-dot" />Fase ENOS dominante</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{ENOS_LABELS[kpis.dominantPhase]}</div>
                  <div className="kpi-delta">meses seleccionados</div>
                </div>
              </div>
            )}

            {/* ── Charts view ── */}
            {viewMode === 'charts' && (
              <>
                <div className="card">
                  <div className="card-head">
                    <div>
                      <h2 className="card-title">
                        Vista general <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>{' '}
                        <span className="accent">{varMeta.name} ({varMeta.unit})</span>
                      </h2>
                      <div className="card-sub">{yearLabel} · {monthLabel}</div>
                    </div>
                    {kpis && (
                      <div className="card-meta">
                        <div>
                          <div style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Rango</div>
                          <strong>{fmtV(kpis.min)} → {fmtV(kpis.max)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    {selectedRegions.length === 0 ? (
                      <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '60px 0', fontSize: 13 }}>
                        Selecciona al menos una región para ver el gráfico.
                      </p>
                    ) : (
                      <OverviewChart
                        rawRecords={rawRecords}
                        source={dataSource}
                        dayRange={dayRange}
                        selectedRegions={selectedRegions}
                        selectedYear={selectedYear}
                        selectedMonths={effectiveMonths}
                        variable={variable}
                        chartType={chartType}
                      />
                    )}
                  </div>
                  {selectedRegions.length > 0 && (
                    <div className="legend">
                      {selectedRegions.map(r => (
                        <span key={r} className="legend-item" style={{ '--c': REGION_COLORS[r] }}>
                          <span className="legend-swatch" />
                          <span>{r}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={detailRef} className="card">
                  <div className="card-head">
                    <div>
                      <h2 className="card-title">
                        Detalle <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>{' '}
                        {detailRegion
                          ? <span style={{ color: REGION_COLORS[detailRegion] }}>{detailRegion}</span>
                          : <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>selecciona una región</span>}
                      </h2>
                      <div className="card-sub">Precipitación + Temperatura · doble eje · {monthLabel}</div>
                    </div>
                  </div>
                  {detailRegion ? (
                    <>
                      <div className="card-body">
                        <DetailChart
                          rawRecords={rawRecords}
                          source={dataSource}
                          dayRange={dayRange}
                          region={detailRegion}
                          selectedYear={selectedYear}
                          selectedMonths={effectiveMonths}
                          chartType={chartType}
                        />
                      </div>
                      <div className="legend">
                        <span className="legend-item" style={{ '--c': REGION_COLORS[detailRegion] }}>
                          <span className="legend-swatch" />
                          <span>Precipitación (mm)</span>
                        </span>
                        <span className="legend-item" style={{ '--c': 'var(--text)' }}>
                          <span className="legend-swatch" />
                          <span>Temperatura media (°C)</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '40px 0 48px', fontSize: 13 }}>
                      Selecciona una región en el panel lateral para ver el gráfico detallado.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Map view ── */}
            {viewMode === 'map' && (
              <>
                <div className="card">
                  <div className="card-head">
                    <div>
                      <h2 className="card-title">
                        Mapa climático <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>{' '}
                        <span className="accent">{varMeta.name} ({varMeta.unit})</span>
                      </h2>
                      <div className="card-sub">{yearLabel} · Toca una región para ver el detalle</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <CostaRicaMap
                      rawRecords={rawRecords}
                      source={dataSource}
                      dayRange={dayRange}
                      selectedYear={selectedYear}
                      selectedMonths={effectiveMonths}
                      variable={variable}
                      selectedDetail={detailRegion}
                      onRegionClick={setDetailRegion}
                    />
                  </div>
                </div>

                <div ref={detailRef} className="card">
                  <div className="card-head">
                    <div>
                      <h2 className="card-title">
                        Detalle <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>—</span>{' '}
                        {detailRegion
                          ? <span style={{ color: REGION_COLORS[detailRegion] }}>{detailRegion}</span>
                          : <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>selecciona una región</span>}
                      </h2>
                      <div className="card-sub">Precipitación + Temperatura · doble eje</div>
                    </div>
                  </div>
                  {detailRegion ? (
                    <div className="card-body">
                      <DetailChart
                        rawRecords={rawRecords}
                        source={dataSource}
                        dayRange={dayRange}
                        region={detailRegion}
                        selectedYear={selectedYear}
                        selectedMonths={effectiveMonths}
                        chartType={chartType}
                      />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '40px 0 48px', fontSize: 13 }}>
                      Toca una región del mapa para ver su gráfico detallado.
                    </p>
                  )}
                </div>
              </>
            )}

            <div style={{ textAlign: 'center', paddingTop: 4, fontSize: 11, color: 'var(--text-4)' }}>
              Datos climáticos sintéticos · Costa Rica 2020–2025 · Proyecto académico
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
