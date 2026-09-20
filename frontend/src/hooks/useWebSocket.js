/**
 * useWebSocket — connects to the backend /ws endpoint and delivers
 * real-time alert messages to the component.
 *
 * Features:
 *  - Auto-reconnect with exponential back-off (up to 30 s)
 *  - Ping/pong keep-alive every 25 s
 *  - Clean disconnect on unmount
 */

import { useState, useEffect, useRef, useCallback } from 'react'

function getWebSocketUrl() {
  const envWs = import.meta.env.VITE_WS_URL
  if (envWs && typeof envWs === 'string') {
    let url = envWs.trim()
    if (url.startsWith('https://')) {
      url = 'wss://' + url.slice(8)
    } else if (url.startsWith('http://')) {
      url = 'ws://' + url.slice(7)
    }
    return url
  }

  // Fallback: derive from VITE_API_BASE_URL if provided
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase && typeof apiBase === 'string' && apiBase.startsWith('http')) {
    try {
      const parsed = new URL(apiBase)
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${parsed.host}/ws`
    } catch {
      // ignore parse error
    }
  }

  // Fallback: use current window location (works via Vite proxy & network IP)
  if (typeof window !== 'undefined' && window.location?.host) {
    const defaultProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${defaultProto}//${window.location.host}/ws`
  }

  return 'ws://localhost:8000/ws'
}

const MAX_RETRIES   = 10
const BASE_DELAY_MS = 1_000

export function useWebSocket(onMessage) {
  const [connected,  setConnected]  = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  const wsRef        = useRef(null)
  const retryCount   = useRef(0)
  const retryTimer   = useRef(null)
  const pingTimer    = useRef(null)
  const unmounted    = useRef(false)
  const onMessageRef = useRef(onMessage)

  // Keep callback ref fresh without re-running the effect
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (unmounted.current) return

    const token = localStorage.getItem('access_token')
    const wsUrl = getWebSocketUrl()
    // Append token as query param (WS doesn't support Authorization header)
    const url = token ? `${wsUrl}?token=${token}` : wsUrl

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmounted.current) { ws.close(); return }
      setConnected(true)
      retryCount.current = 0

      // Keep-alive ping every 25 s
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25_000)
    }

    ws.onmessage = (event) => {
      if (unmounted.current) return
      try {
        const parsed = JSON.parse(event.data)
        if (parsed.type === 'pong') return  // ignore keep-alive responses
        setLastMessage(parsed)
        onMessageRef.current?.(parsed)
      } catch {
        // Non-JSON frame — ignore
      }
    }

    ws.onerror = () => {
      // onclose fires after onerror; reconnect logic lives there
    }

    ws.onclose = () => {
      setConnected(false)
      clearInterval(pingTimer.current)

      if (unmounted.current) return
      if (retryCount.current >= MAX_RETRIES) return

      // Exponential back-off: 1s, 2s, 4s … capped at 30 s
      const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount.current, 30_000)
      retryCount.current += 1
      retryTimer.current = setTimeout(connect, delay)
    }
  }, []) // stable — no deps that change

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      clearTimeout(retryTimer.current)
      clearInterval(pingTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const disconnect = useCallback(() => {
    unmounted.current = true
    clearTimeout(retryTimer.current)
    clearInterval(pingTimer.current)
    wsRef.current?.close()
    setConnected(false)
  }, [])

  return { connected, lastMessage, disconnect }
}

