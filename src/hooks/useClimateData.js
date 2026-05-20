import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'

const NUMERIC_COLS = [
  'año', 'mes', 'dia',
  'temp_media_c', 'temp_max_c', 'temp_min_c',
  'precipitacion_mm', 'humedad_pct', 'viento_kmh',
]

function parseRow(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim()
    const val = typeof v === 'string' ? v.trim() : v
    out[key] = NUMERIC_COLS.includes(key) ? Number(val) : val
  }
  return out
}

/**
 * Loads the selected CSV and returns raw parsed rows.
 * - source='monthly': rows are already monthly aggregates
 * - source='daily':   rows are individual daily records
 * Aggregation (when needed for daily) happens downstream in the chart hooks.
 */
export function useClimateData(source = 'monthly') {
  const [rawRecords, setRawRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const url = source === 'daily'
    ? '/data/dataset_diario.csv'
    : '/data/dataset_mensual.csv'

  useEffect(() => {
    setLoading(true)
    setError(null)
    setRawRecords([])

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`)
        return res.arrayBuffer()
      })
      .then((buffer) => {
        const text = new TextDecoder('utf-8').decode(buffer)
        const result = Papa.parse(text, { header: true, skipEmptyLines: true })
        if (result.errors.length) {
          console.warn('[useClimateData] PapaParse advertencias:', result.errors.slice(0, 3))
        }
        const data = result.data.map(parseRow)
        console.log(
          `[useClimateData] fuente="${source}" · ${data.length} registros. Muestra:`,
          data.slice(0, 2),
        )
        setRawRecords(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[useClimateData] Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [url])

  const years = useMemo(() => {
    const s = new Set(rawRecords.map((d) => d.año))
    return [...s].filter((y) => typeof y === 'number' && !isNaN(y) && y > 0).sort()
  }, [rawRecords])

  return { rawRecords, loading, error, years }
}
