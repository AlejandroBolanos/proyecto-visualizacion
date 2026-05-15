import { useState } from 'react'
import { useClimateData } from './hooks/useClimateData'
import RegionFilter, { REGION_COLORS } from './components/RegionFilter'
import EnosLegend from './components/EnosLegend'
import { OverviewChart, DetailChart } from './components/ClimateChart'

const ALL_REGIONS = Object.keys(REGION_COLORS)

export default function App() {
  const { rawData, loading, error, years } = useClimateData()

  const [selectedRegions, setSelectedRegions] = useState([...ALL_REGIONS])
  const [selectedYear, setSelectedYear] = useState('all')
  const [variable, setVariable] = useState('precipitacion_mm')
  const [detailRegion, setDetailRegion] = useState(null)

  function handleToggleRegion(region, mode) {
    if (mode === 'all') { setSelectedRegions([...ALL_REGIONS]); return }
    if (mode === 'none') { setSelectedRegions([]); return }
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a' }}>
      {/* Header */}
      <header className="border-b border-slate-700/60" style={{ background: '#1e293b' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Visualización de Datos Climáticos
              <span className="ml-2 text-blue-400 font-normal">· Costa Rica</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis multivariado 2020–2024 · Metodología Riccardo Mazza
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

      {/* Body */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando datos climáticos…
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-96">
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-red-300 text-sm">
              Error al cargar datos: {error}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-6">
            {/* Sidebar */}
            <RegionFilter
              selectedRegions={selectedRegions}
              onToggleRegion={handleToggleRegion}
              years={years}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              variable={variable}
              onVariableChange={setVariable}
              selectedDetail={detailRegion}
              onDetailChange={setDetailRegion}
            />

            {/* Charts area */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* ENOS legend */}
              <div
                className="rounded-xl px-5 py-3 border border-slate-700/60"
                style={{ background: '#1e293b' }}
              >
                <EnosLegend />
              </div>

              {/* Overview */}
              <div
                className="rounded-xl px-5 py-5 border border-slate-700/60"
                style={{ background: '#1e293b' }}
              >
                {selectedRegions.length === 0 ? (
                  <p className="text-slate-500 text-sm py-20 text-center">
                    Selecciona al menos una región para ver el gráfico.
                  </p>
                ) : (
                  <OverviewChart
                    rawData={rawData}
                    selectedRegions={selectedRegions}
                    selectedYear={selectedYear}
                    variable={variable}
                  />
                )}
              </div>

              {/* Detail */}
              {detailRegion && (
                <div
                  className="rounded-xl px-5 py-5 border border-slate-700/60"
                  style={{ background: '#1e293b' }}
                >
                  <DetailChart
                    rawData={rawData}
                    region={detailRegion}
                    selectedYear={selectedYear}
                  />
                </div>
              )}

              {!detailRegion && (
                <div
                  className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center text-slate-600 text-sm"
                >
                  Selecciona una región en el panel lateral para ver el gráfico detallado combinado.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
        Datos climáticos sintéticos · Costa Rica 2020–2024 · Proyecto académico
      </footer>
    </div>
  )
}
