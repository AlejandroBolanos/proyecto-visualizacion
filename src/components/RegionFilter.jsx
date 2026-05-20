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

const CHART_TYPES = [
  {
    value: 'bar', label: 'Barras',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <rect x="2" y="10" width="4" height="8" rx="1" />
        <rect x="8" y="6"  width="4" height="12" rx="1" />
        <rect x="14" y="3" width="4" height="15" rx="1" />
      </svg>
    ),
  },
  {
    value: 'area', label: 'Área',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M1 17 L5 9 L9 12 L13 5 L17 8 L19 6 L19 17 Z" />
      </svg>
    ),
  },
  {
    value: 'line', label: 'Línea',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <polyline points="1,16 5,8 9,11 13,4 17,7 19,5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="5" cy="8" r="2" fill="currentColor" stroke="none" />
        <circle cx="9" cy="11" r="2" fill="currentColor" stroke="none" />
        <circle cx="13" cy="4" r="2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="7" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const MONTHS = [
  { n: 1,  label: 'Ene' }, { n: 2,  label: 'Feb' }, { n: 3,  label: 'Mar' },
  { n: 4,  label: 'Abr' }, { n: 5,  label: 'May' }, { n: 6,  label: 'Jun' },
  { n: 7,  label: 'Jul' }, { n: 8,  label: 'Ago' }, { n: 9,  label: 'Set' },
  { n: 10, label: 'Oct' }, { n: 11, label: 'Nov' }, { n: 12, label: 'Dic' },
]

const ALL_MONTHS = MONTHS.map((m) => m.n)

export default function RegionFilter({
  // data source
  dataSource, onDataSourceChange,
  // chart type
  chartType, onChartTypeChange,
  // variable
  variable, onVariableChange,
  // year
  years, selectedYear, onYearChange,
  // month filter
  selectedMonths, onMonthsChange,
  // day range (daily only)
  dayRange, onDayRangeChange,
  // regions
  selectedRegions, onToggleRegion,
  // detail region
  selectedDetail, onDetailChange,
}) {
  const allRegions = selectedRegions.length === ALL_REGIONS.length
  const allMonths  = selectedMonths.length === 12

  function toggleAllRegions() {
    onToggleRegion(null, allRegions ? 'none' : 'all')
  }

  function toggleMonth(n) {
    if (selectedMonths.includes(n)) {
      if (selectedMonths.length === 1) return // keep at least one
      onMonthsChange(selectedMonths.filter((m) => m !== n))
    } else {
      onMonthsChange([...selectedMonths, n].sort((a, b) => a - b))
    }
  }

  function setDayFrom(val) {
    const n = Math.max(1, Math.min(dayRange.to, Number(val) || 1))
    onDayRangeChange({ ...dayRange, from: n })
  }

  function setDayTo(val) {
    const n = Math.min(31, Math.max(dayRange.from, Number(val) || 31))
    onDayRangeChange({ ...dayRange, to: n })
  }

  return (
    <aside className="w-64 flex-shrink-0 space-y-5">

      {/* ── Fuente ── */}
      <Section label="Tipo de vista">
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          {[{ value: 'monthly', label: 'Mensual' }, { value: 'daily', label: 'Diaria' }].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDataSourceChange(opt.value)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                dataSource === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Tipo de gráfico ── */}
      <Section label="Tipo de gráfico">
        <div className="flex gap-1.5">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => onChartTypeChange(ct.value)}
              title={ct.label}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                chartType === ct.value
                  ? 'border-blue-500 bg-blue-900/40 text-blue-300'
                  : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {ct.icon}
              {ct.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Variable ── */}
      <Section label="Variables principales">
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
      </Section>

      {/* ── Año ── */}
      <Section label="Año">
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
      </Section>

      {/* ── Meses ── */}
      <Section
        label="Meses"
        action={
          <button
            onClick={() => onMonthsChange(allMonths ? [selectedMonths[0]] : [...ALL_MONTHS])}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {allMonths ? 'Limpiar' : 'Todos'}
          </button>
        }
      >
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map(({ n, label }) => {
            const active = selectedMonths.includes(n)
            return (
              <button
                key={n}
                onClick={() => toggleMonth(n)}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Rango de días (solo modo diario) ── */}
      {dataSource === 'daily' && (
        <Section label="Rango de días">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-16 flex-shrink-0">Día inicio</label>
              <input
                type="number" min={1} max={dayRange.to} value={dayRange.from}
                onChange={(e) => setDayFrom(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 w-16 flex-shrink-0">Día fin</label>
              <input
                type="number" min={dayRange.from} max={31} value={dayRange.to}
                onChange={(e) => setDayTo(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Visual range bar */}
            <div className="relative h-1.5 bg-slate-700 rounded-full mt-1">
              <div
                className="absolute h-1.5 bg-blue-500 rounded-full"
                style={{
                  left:  `${((dayRange.from - 1) / 30) * 100}%`,
                  right: `${((31 - dayRange.to)  / 30) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              {dayRange.from === 1 && dayRange.to === 31
                ? 'Todos los días del mes'
                : `Días ${dayRange.from} al ${dayRange.to} de cada mes`}
            </p>
            {(dayRange.from !== 1 || dayRange.to !== 31) && (
              <button
                onClick={() => onDayRangeChange({ from: 1, to: 31 })}
                className="w-full text-xs text-slate-500 hover:text-blue-400 transition-colors"
              >
                Restablecer rango
              </button>
            )}
          </div>
        </Section>
      )}

      {/* ── Regiones ── */}
      <Section
        label="Regiones"
        action={
          <button
            onClick={toggleAllRegions}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {allRegions ? 'Ninguna' : 'Todas'}
          </button>
        }
      >
        <div className="space-y-0.5">
          {ALL_REGIONS.map((region) => {
            const checked = selectedRegions.includes(region)
            const color = REGION_COLORS[region]
            return (
              <label
                key={region}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors group"
              >
                <input
                  type="checkbox" checked={checked}
                  onChange={() => onToggleRegion(region)}
                  className="sr-only"
                />
                <span
                  className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{ borderColor: color, backgroundColor: checked ? color : 'transparent' }}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                  {region}
                </span>
                <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }} />
              </label>
            )
          })}
        </div>
      </Section>

      {/* ── Detalle ── */}
      <Section label="Detalle de región">
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
      </Section>

    </aside>
  )
}

/** Small wrapper for sidebar sections */
function Section({ label, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
