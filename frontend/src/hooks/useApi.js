import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../utils/api.js'

// ── useApi — fetch with loading / error state ─────────────
export function useApi(path, deps = []) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(path)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── usePoll — poll until condition met ────────────────────
export function usePoll(videoId, status, onUpdate, interval = 3000) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!videoId) return
    if (status !== 'pending' && status !== 'processing') return

    timerRef.current = setInterval(async () => {
      try {
        const { video } = await api.get(`/api/videos/${videoId}`)
        onUpdate(video)
        if (video.status === 'done' || video.status === 'error') {
          clearInterval(timerRef.current)
        }
      } catch {
        clearInterval(timerRef.current)
      }
    }, interval)

    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, status])
}
