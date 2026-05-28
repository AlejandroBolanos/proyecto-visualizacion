import { useState, useRef, useEffect } from 'react'
import { useClimateData } from './hooks/useClimateData'
import RegionFilter, { REGION_COLORS } from './components/RegionFilter'
import EnosLegend from './components/EnosLegend'
import { OverviewChart, DetailChart } from './components/ClimateChart'
import CostaRicaMap from './components/CostaRicaMap'

const ALL_REGIONS = Object.keys(REGION_COLORS)

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

  const detailRef = useRef(null)

  const { rawRecords, loading, error, years } = useClimateData(dataSource)

  // Auto-scroll al gráfico detallado en móvil al seleccionar una región
  useEffect(() => {
    if (!detailRegion) return
    if (window.innerWidth >= 768) return
    const timer = setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(timer)
  }, [detailRegion])

  function handleToggleRegion(region, mode) {
    if (mode === 'all')  { setSelectedRegions([...ALL_REGIONS]); return }
    if (mode === 'none') { setSelectedRegions([]); return }
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
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
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a' }}>

      {/* ── Header ── */}
      <header className="border-b border-slate-700/60" style={{ background: '#1e293b' }}>
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Visualización de Datos Climáticos
              <span className="ml-2 text-blue-400 font-normal">· Costa Rica</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis multivariado 2020–2025
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="hidden sm:inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Visualización de la Información
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
              Proyecto Universitario
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">

        {loading && (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Cargando datos climáticos…</p>
              <p className="text-xs text-slate-600 mt-1">
                {dataSource === 'daily' ? 'Leyendo registros diarios…' : 'Procesando dataset mensual…'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-96">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-red-300 text-sm max-w-md text-center">
              <p className="font-semibold mb-1">Error al cargar datos</p>
              <p className="text-red-400">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Verifica que los archivos CSV existan en /public/data/
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Drawer móvil ── */}
            {sidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="relative z-10 w-72 max-w-[88vw] bg-slate-900 border-r border-slate-700 flex flex-col">
                  <div className="sticky top-0 bg-slate-900/95 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Filtros</span>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <RegionFilter {...filterProps} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-6">

              {/* ── Sidebar desktop ── */}
              <div className="hidden md:block w-64 flex-shrink-0">
                <div className="sticky top-4 overflow-y-auto max-h-[calc(100vh-80px)] pr-1">
                  <RegionFilter {...filterProps} />
                </div>
              </div>

              {/* ── Área principal ── */}
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">

                {/* Botón filtros (solo móvil) */}
                <button
                  className="md:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                  onClick={() => setSidebarOpen(true)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Filtros y configuración
                </button>

                {/* ENOS legend + toggle de vista */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 sm:px-5 py-3 border border-slate-700/60" style={{ background: '#1e293b' }}>
                  <EnosLegend />
                  <div className="flex rounded-lg overflow-hidden border border-slate-600 flex-shrink-0">
                    {[
                      { value: 'charts', label: 'Gráficos' },
                      { value: 'map',    label: 'Mapa' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setViewMode(opt.value)}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-medium transition-colors ${
                          viewMode === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Vista gráficos ── */}
                {viewMode === 'charts' && (
                  <>
                    <div className="rounded-xl px-3 sm:px-5 py-4 sm:py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
                      {selectedRegions.length === 0 ? (
                        <p className="text-slate-500 text-sm py-20 text-center">
                          Selecciona al menos una región para ver el gráfico.
                        </p>
                      ) : (
                        <OverviewChart
                          rawRecords={rawRecords}
                          source={dataSource}
                          dayRange={dayRange}
                          selectedRegions={selectedRegions}
                          selectedYear={selectedYear}
                          selectedMonths={selectedMonths}
                          variable={variable}
                          chartType={chartType}
                        />
                      )}
                    </div>

                    {detailRegion ? (
                      <div ref={detailRef} className="rounded-xl px-3 sm:px-5 py-4 sm:py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
                        <DetailChart
                          rawRecords={rawRecords}
                          source={dataSource}
                          dayRange={dayRange}
                          region={detailRegion}
                          selectedYear={selectedYear}
                          selectedMonths={selectedMonths}
                          chartType={chartType}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center text-slate-600 text-sm">
                        Selecciona una región en el panel lateral para ver el gráfico detallado combinado.
                      </div>
                    )}
                  </>
                )}

                {/* ── Vista mapa ── */}
                {viewMode === 'map' && (
                  <>
                    <div className="rounded-xl px-3 sm:px-6 py-4 sm:py-5 border border-slate-700/60 overflow-x-auto" style={{ background: '#1e293b' }}>
                      <CostaRicaMap
                        rawRecords={rawRecords}
                        source={dataSource}
                        dayRange={dayRange}
                        selectedYear={selectedYear}
                        selectedMonths={selectedMonths}
                        variable={variable}
                        selectedDetail={detailRegion}
                        onRegionClick={setDetailRegion}
                      />
                    </div>

                    {detailRegion ? (
                      <div ref={detailRef} className="rounded-xl px-3 sm:px-5 py-4 sm:py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
                        <DetailChart
                          rawRecords={rawRecords}
                          source={dataSource}
                          dayRange={dayRange}
                          region={detailRegion}
                          selectedYear={selectedYear}
                          selectedMonths={selectedMonths}
                          chartType={chartType}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center text-slate-600 text-sm">
                        Haz clic en una región del mapa para ver su gráfico detallado.
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
        Datos climáticos sintéticos · Costa Rica 2020–2025 · Proyecto académico
      </footer>
    </div>
  )
}
