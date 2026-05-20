import { useState } from 'react'
import { useClimateData } from './hooks/useClimateData'
import RegionFilter, { REGION_COLORS } from './components/RegionFilter'
import EnosLegend from './components/EnosLegend'
import { OverviewChart, DetailChart } from './components/ClimateChart'
import CostaRicaMap from './components/CostaRicaMap'

const ALL_REGIONS = Object.keys(REGION_COLORS)
const ALL_MONTHS  = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function App() {
  const [dataSource,      setDataSource]      = useState('monthly')
  const [chartType,       setChartType]       = useState('bar')
  const [selectedRegions, setSelectedRegions] = useState([...ALL_REGIONS])
  const [selectedYear,    setSelectedYear]    = useState('all')
  const [variable,        setVariable]        = useState('precipitacion_mm')
  const [detailRegion,    setDetailRegion]    = useState(null)
  const [selectedMonths,  setSelectedMonths]  = useState([...ALL_MONTHS])
  const [dayRange,        setDayRange]        = useState({ from: 1, to: 31 })
  const [viewMode,        setViewMode]        = useState('charts') // 'charts' | 'map'

  const { rawRecords, loading, error, years } = useClimateData(dataSource)

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
    // Reset day range when switching back to monthly
    if (src === 'monthly') setDayRange({ from: 1, to: 31 })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a' }}>

      {/* ── Header ── */}
      <header className="border-b border-slate-700/60" style={{ background: '#1e293b' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Visualización de Datos Climáticos
              <span className="ml-2 text-blue-400 font-normal">· Costa Rica</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis multivariado 2020–2025
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Visualización de la Información
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
              Proyecto Universitario
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">

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
          <div className="flex gap-6">

            {/* ── Sidebar ── */}
            <RegionFilter
              dataSource={dataSource}       onDataSourceChange={handleDataSourceChange}
              chartType={chartType}         onChartTypeChange={setChartType}
              variable={variable}           onVariableChange={setVariable}
              years={years}                 selectedYear={selectedYear}    onYearChange={setSelectedYear}
              selectedMonths={selectedMonths}  onMonthsChange={setSelectedMonths}
              dayRange={dayRange}           onDayRangeChange={setDayRange}
              selectedRegions={selectedRegions} onToggleRegion={handleToggleRegion}
              selectedDetail={detailRegion} onDetailChange={setDetailRegion}
            />

            {/* ── Charts / Map area ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* ENOS legend + view toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-3 border border-slate-700/60" style={{ background: '#1e293b' }}>
                <EnosLegend />
                <div className="flex rounded-lg overflow-hidden border border-slate-600 flex-shrink-0">
                  {[
                    { value: 'charts', label: 'Gráficos' },
                    { value: 'map',    label: 'Mapa' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setViewMode(opt.value)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Gráficos view ── */}
              {viewMode === 'charts' && (
                <>
                  <div className="rounded-xl px-5 py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
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
                    <div className="rounded-xl px-5 py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
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

              {/* ── Mapa view ── */}
              {viewMode === 'map' && (
                <>
                  <div className="rounded-xl px-6 py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
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
                    <div className="rounded-xl px-5 py-5 border border-slate-700/60" style={{ background: '#1e293b' }}>
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
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
        Datos climáticos sintéticos · Costa Rica 2020–2025 · Proyecto académico
      </footer>
    </div>
  )
}
