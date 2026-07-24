import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import api from '../../api/axios'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { useSocket } from '../../hooks/useSocket'
import toast from 'react-hot-toast'

/**
 * ConversationPanel — the right-hand chat panel showing messages for one conversation.
 *
 * Props:
 *   conversation: Conversation (with populated participants)
 *   onBack()                    — mobile: go back to contact list
 */
export default function ConversationPanel({ conversation, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const { socket, emit } = useSocket()
  const scrollContainerRef = useRef(null)
  const topRef = useRef(null)
  const prevScrollHeight = useRef(0)

  const conversationId = conversation?._id
  const otherUser = conversation?.otherParticipant

  // ── Load initial messages ───────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`)
      setMessages(res.data.data || [])
      setHasMore(res.data.hasMore || false)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    loadMessages()
    // Mark as read when opening
    api.patch(`/chat/conversations/${conversationId}/read`).catch(() => {})
  }, [conversationId, loadMessages])

  // ── Auto-scroll to bottom on new messages ───────────────────────────────
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      // Scroll the messages container itself, not the page
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, loading])

  // ── Join socket room ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !socket) return
    emit('join_conversation', { conversationId })
    return () => {
      emit('leave_conversation', { conversationId })
    }
  }, [conversationId, socket, emit])

  // ── Listen for new messages via socket ───────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = ({ conversationId: cId, message }) => {
      if (cId !== conversationId) return
      setMessages((prev) => {
        // Deduplicate
        if (prev.find((m) => m._id === message._id)) return prev
        return [...prev, message]
      })
      // Mark as read immediately if panel is open
      api.patch(`/chat/conversations/${conversationId}/read`).catch(() => {})
    }

    const handleTyping = ({ conversationId: cId, userName }) => {
      if (cId !== conversationId) return
      setTypingUser(userName)
    }

    const handleStopTyping = ({ conversationId: cId }) => {
      if (cId !== conversationId) return
      setTypingUser(null)
    }

    socket.on('new_message', handleNewMessage)
    socket.on('user_typing', handleTyping)
    socket.on('user_stop_typing', handleStopTyping)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('user_typing', handleTyping)
      socket.off('user_stop_typing', handleStopTyping)
    }
  }, [socket, conversationId])

  // ── Load older messages (scroll up) ────────────────────────────────────
  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    prevScrollHeight.current = topRef.current?.parentElement?.scrollHeight || 0
    try {
      const oldest = messages[0]
      const res = await api.get(`/chat/conversations/${conversationId}/messages?before=${oldest._id}`)
      const older = res.data.data || []
      setMessages((prev) => [...older, ...prev])
      setHasMore(res.data.hasMore || false)
    } catch {
      toast.error('Failed to load earlier messages')
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Send text ────────────────────────────────────────────────────────────
  const handleSendText = async (content) => {
    setSending(true)
    try {
      const res = await api.post(`/chat/conversations/${conversationId}/messages`, { content })
      setMessages((prev) => {
        if (prev.find((m) => m._id === res.data.data._id)) return prev
        return [...prev, res.data.data]
      })
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // ── Send image ───────────────────────────────────────────────────────────
  const handleSendImage = async (file) => {
    setSending(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await api.post(`/chat/conversations/${conversationId}/messages/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessages((prev) => {
        if (prev.find((m) => m._id === res.data.data._id)) return prev
        return [...prev, res.data.data]
      })
    } catch {
      toast.error('Failed to send image')
    } finally {
      setSending(false)
    }
  }

  const avatar =
    otherUser?.profile?.avatarUrl ||
    otherUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || 'U')}&background=2563eb&color=fff&size=64`

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">Select a contact to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <img src={avatar} alt={otherUser?.name} className="w-9 h-9 rounded-full object-cover" />
        <div>
          <p className="text-sm font-semibold text-slate-800">{otherUser?.name}</p>
          <p className="text-xs text-slate-500 capitalize">{otherUser?.role}</p>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-4 py-1.5 bg-white rounded-full border border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1"
            >
              {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        <div ref={topRef} />

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={22} className="animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
            <p className="text-3xl">👋</p>
            <p className="text-sm">Say hello to {otherUser?.name}!</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg._id} message={msg} />)
        )}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
              <span className="text-xs text-slate-500">{typingUser} is typing</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Input */}
      <ChatInput
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        disabled={sending}
        onTyping={() => emit('typing', { conversationId })}
        onStopTyping={() => emit('stop_typing', { conversationId })}
      />
    </div>
  )
}
