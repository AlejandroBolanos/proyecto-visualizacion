export const REGION_COLORS = {
  'Pacífico Norte':   '#f97316',
  'Pacífico Central': '#eab308',
  'Pacífico Sur':     '#ef4444',
  'Valle Central':    '#22c55e',
  'Zona Norte':       '#3b82f6',
  'Caribe Norte':     '#a855f7',
  'Caribe Sur':       '#06b6d4',
}

const ALL_REGIONS = Object.keys(REGION_COLORS)

const VARIABLES = [
  { value: 'precipitacion_mm', label: 'Precipitación (mm)' },
  { value: 'temp_media_c',     label: 'Temperatura media (°C)' },
  { value: 'humedad_pct',      label: 'Humedad (%)' },
]

export default function RegionFilter({
  selectedRegions,
  onToggleRegion,
  years,
  selectedYear,
  onYearChange,
  variable,
  onVariableChange,
  selectedDetail,
  onDetailChange,
}) {
  const allSelected = selectedRegions.length === ALL_REGIONS.length

  function toggleAll() {
    if (allSelected) {
      onToggleRegion(null, 'none')
    } else {
      onToggleRegion(null, 'all')
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      {/* Variable toggle */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Variable principal
        </h3>
        <div className="space-y-1">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              onClick={() => onVariableChange(v.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                variable === v.value
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year selector */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Año
        </h3>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los años (promedio)</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Region checkboxes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Regiones
          </h3>
          <button
            onClick={toggleAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {allSelected ? 'Ninguna' : 'Todas'}
          </button>
        </div>
        <div className="space-y-1">
          {ALL_REGIONS.map((region) => {
            const checked = selectedRegions.includes(region)
            const color = REGION_COLORS[region]
            return (
              <label
                key={region}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors group"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRegion(region)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all`}
                  style={{
                    borderColor: color,
                    backgroundColor: checked ? color : 'transparent',
                  }}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                  {region}
                </span>
                <span
                  className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* Detail region selector */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Detalle de región
        </h3>
        <select
          value={selectedDetail ?? ''}
          onChange={(e) => onDetailChange(e.target.value || null)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Seleccionar región —</option>
          {ALL_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {selectedDetail && (
          <p className="mt-1 text-xs text-slate-500">
            Vista combinada: precipitación + temperatura
          </p>
        )}
      </div>
    </aside>
  )
}
