import { useState } from 'react'
import Icon from './Icon'

export const REGION_COLORS = {
  'Pacífico Norte':   '#d97546',
  'Pacífico Central': '#c8941f',
  'Pacífico Sur':     '#c8403c',
  'Valle Central':    '#2f9659',
  'Zona Norte':       '#2563eb',
  'Caribe Norte':     '#7c5cd6',
  'Caribe Sur':       '#0ea5b5',
}

const ALL_REGIONS = Object.keys(REGION_COLORS)

const VARIABLES = [
  { value: 'precipitacion_mm', label: 'Precipitación', unit: 'mm',   icon: 'rain' },
  { value: 'temp_media_c',     label: 'Temperatura',   unit: '°C',   icon: 'temp' },
  { value: 'humedad_pct',      label: 'Humedad rel.',  unit: '%',    icon: 'drop' },
]

const MONTHS = [
  { n: 1,  label: 'Ene' }, { n: 2,  label: 'Feb' }, { n: 3,  label: 'Mar' },
  { n: 4,  label: 'Abr' }, { n: 5,  label: 'May' }, { n: 6,  label: 'Jun' },
  { n: 7,  label: 'Jul' }, { n: 8,  label: 'Ago' }, { n: 9,  label: 'Set' },
  { n: 10, label: 'Oct' }, { n: 11, label: 'Nov' }, { n: 12, label: 'Dic' },
]

const ALL_MONTHS = MONTHS.map(m => m.n)

export const REGION_CENTROIDS = {
  'Pacífico Norte':   { lat: 10.6, lng: -85.4 },
  'Pacífico Central': { lat: 9.8,  lng: -84.8 },
  'Pacífico Sur':     { lat: 8.7,  lng: -83.5 },
  'Valle Central':    { lat: 9.9,  lng: -84.0 },
  'Zona Norte':       { lat: 10.7, lng: -84.3 },
  'Caribe Norte':     { lat: 10.3, lng: -83.4 },
  'Caribe Sur':       { lat: 9.4,  lng: -82.9 },
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function RegionFilter({
  dataSource, onDataSourceChange,
  chartType,  onChartTypeChange,
  variable,   onVariableChange,
  years,      selectedYear,    onYearChange,
  selectedMonths,              onMonthsChange,
  dayRange,                    onDayRangeChange,
  selectedRegions,             onToggleRegion,
  selectedDetail,              onDetailChange,
  onNearestRegions,
  onClose,
}) {
  const allRegions = selectedRegions.length === ALL_REGIONS.length
  const allMonths  = selectedMonths.length === 12

  const [geoStatus, setGeoStatus] = useState('idle')

  function toggleAllRegions() {
    onToggleRegion(null, allRegions ? 'none' : 'all')
  }

  function toggleMonth(n) {
    if (selectedMonths.includes(n)) {
      if (selectedMonths.length === 1) return
      onMonthsChange(selectedMonths.filter(m => m !== n))
    } else {
      onMonthsChange([...selectedMonths, n].sort((a, b) => a - b))
    }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) { setGeoStatus('error'); return }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const nearest = Object.entries(REGION_CENTROIDS)
          .map(([region, c]) => ({ region, dist: haversineKm(lat, lng, c.lat, c.lng) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3)
          .map(d => d.region)
        onNearestRegions(nearest)
        setGeoStatus('idle')
      },
      () => setGeoStatus('error'),
      { timeout: 8000 }
    )
  }

  return (
    <>
      {/* Brand header */}
      <div className="brand">
        <div className="brand-title">
          <span>Clima CR · 2020–2025</span>
          <button
            className="btn btn-ghost btn-icon sidebar-close-btn"
            style={{ marginLeft: 'auto' }}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="brand-sub">Análisis multivariado</div>
      </div>

      {/* Scrollable body */}
      <div className="sidebar-body">

        {/* Frecuencia */}
        <div className="fs">
          <div className="fs-label">Frecuencia</div>
          <div className="seg">
            <button
              data-active={dataSource === 'monthly'}
              onClick={() => onDataSourceChange('monthly')}
            >Mensual</button>
            <button
              data-active={dataSource === 'daily'}
              onClick={() => onDataSourceChange('daily')}
            >Diaria</button>
          </div>
        </div>

        {/* Tipo de gráfico */}
        <div className="fs">
          <div className="fs-label">Tipo de gráfico</div>
          <div className="chart-type">
            <button data-active={chartType === 'bar'}  onClick={() => onChartTypeChange('bar')}>
              <Icon name="bar" size={16} /><span>Barras</span>
            </button>
            <button data-active={chartType === 'area'} onClick={() => onChartTypeChange('area')}>
              <Icon name="area" size={16} /><span>Área</span>
            </button>
            <button data-active={chartType === 'line'} onClick={() => onChartTypeChange('line')}>
              <Icon name="line" size={16} /><span>Línea</span>
            </button>
          </div>
        </div>

        {/* Variable principal */}
        <div className="fs">
          <div className="fs-label">Variable principal</div>
          <div className="var-list">
            {VARIABLES.map(v => (
              <button
                key={v.value}
                className="var-item"
                data-active={variable === v.value}
                onClick={() => onVariableChange(v.value)}
              >
                <span className="var-glyph">
                  <Icon name={v.icon} size={12} />
                </span>
                <span>{v.label}</span>
                <span className="var-unit">{v.unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Año */}
        <div className="fs">
          <div className="fs-label">Año</div>
          <div className="field-select">
            <select
              value={selectedYear}
              onChange={e => onYearChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos los años (promedio)</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Meses */}
        <div className="fs">
          <div className="fs-label">
            <span>Meses</span>
            <button
              className="fs-action"
              onClick={() => onMonthsChange(allMonths ? [selectedMonths[0] ?? 1] : [...ALL_MONTHS])}
            >
              {allMonths ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="months">
            {MONTHS.map(({ n, label }) => (
              <button
                key={n}
                className="month-chip"
                data-active={selectedMonths.includes(n)}
                onClick={() => toggleMonth(n)}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Rango de días — solo modo diario */}
        {dataSource === 'daily' && (
          <div className="fs">
            <div className="fs-label">Rango de días</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
              <div className="range-row">
                <span style={{ minWidth: 24 }}>{dayRange.from}</span>
                <input
                  type="range" className="range"
                  min={1} max={dayRange.to} value={dayRange.from}
                  onChange={e => onDayRangeChange({ ...dayRange, from: Math.min(Number(e.target.value), dayRange.to) })}
                />
              </div>
              <div className="range-row">
                <span style={{ minWidth: 24 }}>{dayRange.to}</span>
                <input
                  type="range" className="range"
                  min={dayRange.from} max={31} value={dayRange.to}
                  onChange={e => onDayRangeChange({ ...dayRange, to: Math.max(Number(e.target.value), dayRange.from) })}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Día {dayRange.from} → {dayRange.to} de cada mes
              </div>
            </div>
          </div>
        )}

        {/* Regiones */}
        <div className="fs">
          <div className="fs-label">
            <span>Regiones</span>
            <button className="fs-action" onClick={toggleAllRegions}>
              {allRegions ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div className="region-list">
            {ALL_REGIONS.map(region => (
              <div
                key={region}
                className="region-row"
                data-checked={selectedRegions.includes(region)}
                onClick={() => onToggleRegion(region)}
                style={{ '--c': REGION_COLORS[region] }}
              >
                <span className="region-check" />
                <span className="region-dot" />
                <span className="region-name">{region}</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn-block"
            style={{ marginTop: 10 }}
            onClick={handleGeolocate}
            disabled={geoStatus === 'loading'}
          >
            {geoStatus === 'loading' ? (
              <>
                <span style={{ width: 12, height: 12, border: '1.5px solid var(--text-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Localizando…
              </>
            ) : (
              <><Icon name="loc" /> Seleccionar 3 zonas cercanas</>
            )}
          </button>
          {geoStatus === 'error' && (
            <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4, textAlign: 'center' }}>
              No se pudo obtener la ubicación
            </p>
          )}
        </div>

        {/* Detalle de región */}
        <div className="fs">
          <div className="fs-label">Detalle de región</div>
          <div className="field-select">
            <select
              value={selectedDetail ?? ''}
              onChange={e => onDetailChange(e.target.value || null)}
            >
              <option value="">— Seleccionar región —</option>
              {ALL_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
            Vista combinada · precipitación + temperatura
          </div>
        </div>

      </div>
    </>
  )
}
