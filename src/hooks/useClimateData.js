import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'

const NUMERIC_COLS = [
  'año', 'mes', 'temp_media_c', 'temp_max_c', 'temp_min_c',
  'precipitacion_mm', 'humedad_pct', 'viento_kmh',
]

function parseRow(row) {
  const out = { ...row }
  for (const col of NUMERIC_COLS) {
    if (col in out) out[col] = Number(out[col])
  }
  return out
}

export function useClimateData() {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/data/dataset_mensual.csv')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        })
        if (result.errors.length) {
          console.warn('PapaParse warnings:', result.errors)
        }
        setRawData(result.data.map(parseRow))
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const years = useMemo(() => {
    const s = new Set(rawData.map((d) => d.año))
    return [...s].sort()
  }, [rawData])

  return { rawData, loading, error, years }
}
