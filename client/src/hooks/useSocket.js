import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth'

// In dev the Vite dev server proxies /socket.io → the backend, so connect to
// the same origin. In production use VITE_API_URL (Render), falling back to
// the same origin so relative paths keep working.
const SOCKET_URL = import.meta.env.DEV
  ? window.location.origin
  : (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, '')

let socketInstance = null

/**
 * useSocket — manages a singleton Socket.io connection.
 * Returns the socket instance and an `emit` helper.
 *
 * Usage:
 *   const { socket, emit } = useSocket()
 */
export function useSocket() {
  const { token } = useAuth()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return

    // Reuse existing connection if already established
    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketInstance.on('connect', () => {
        console.log('[Socket] Connected:', socketInstance.id)
      })
      socketInstance.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message)
      })
      socketInstance.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
      })
    }

    socketRef.current = socketInstance

    return () => {
      // Don't disconnect on unmount — keep the singleton alive
    }
  }, [token])

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return { socket: socketRef.current, emit }
}
