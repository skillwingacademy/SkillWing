import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, Users, ChevronLeft, Eye } from 'lucide-react'
import api from '../../api/axios'
import MessageBubble from './MessageBubble'
import toast from 'react-hot-toast'

const ROLE_COLORS = {
  student: 'bg-emerald-100 text-emerald-700',
  teacher: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

/**
 * AdminMonitorPanel — lets admin browse and read-only view all conversations.
 * Two sub-panels:
 *   Left:  list of all conversations (searchable by user name/email)
 *   Right: read-only message thread
 */
export default function AdminMonitorPanel() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchTimer = useRef(null)

  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Mobile: which sub-panel
  const [mobileView, setMobileView] = useState('list')

  // ── Load all conversations ───────────────────────────────────────────────
  const loadConversations = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const url = q.trim()
        ? `/chat/admin/all-conversations?search=${encodeURIComponent(q.trim())}`
        : '/chat/admin/all-conversations'
      const res = await api.get(url)
      setConversations(res.data.data || [])
    } catch {
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadConversations(val), 350)
  }

  // ── Load messages for selected convo ─────────────────────────────────────
  const loadMessages = async (convo) => {
    setSelectedConvo(convo)
    setMsgLoading(true)
    setMessages([])
    setMobileView('thread')
    try {
      const res = await api.get(`/chat/admin/conversations/${convo._id}/messages`)
      setMessages(res.data.data || [])
      setHasMore(res.data.hasMore || false)
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setMsgLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = messages[0]
      const res = await api.get(
        `/chat/admin/conversations/${selectedConvo._id}/messages?before=${oldest._id}`
      )
      setMessages((prev) => [...(res.data.data || []), ...prev])
      setHasMore(res.data.hasMore || false)
    } catch {
      toast.error('Failed to load earlier messages')
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function ConvoRow({ convo }) {
    const [p1, p2] = convo.participants || []
    const lastMsg = convo.lastMessage
    const preview = lastMsg
      ? lastMsg.type === 'image' ? '📷 Image' : lastMsg.content?.slice(0, 50)
      : 'No messages yet'
    const timeStr = convo.lastMessageAt
      ? new Date(convo.lastMessageAt).toLocaleString('en-IN', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : ''

    const isSelected = selectedConvo?._id === convo._id

    const avatar1 = p1?.profile?.avatarUrl || p1?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(p1?.name || 'U')}&size=48&background=2563eb&color=fff`
    const avatar2 = p2?.profile?.avatarUrl || p2?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(p2?.name || 'U')}&size=48&background=7c3aed&color=fff`

    return (
      <button
        onClick={() => loadMessages(convo)}
        className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all border ${
          isSelected ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50'
        }`}
      >
        {/* Stacked avatars */}
        <div className="relative w-10 h-10 shrink-0 mt-0.5">
          <img src={avatar1} alt={p1?.name} className="absolute top-0 left-0 w-7 h-7 rounded-full object-cover border-2 border-white" />
          <img src={avatar2} alt={p2?.name} className="absolute bottom-0 right-0 w-7 h-7 rounded-full object-cover border-2 border-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-sm font-semibold text-slate-800 truncate">
              {p1?.name} <span className="text-slate-400 font-normal">&</span> {p2?.name}
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">{timeStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[p1, p2].map((p, i) => p && (
              <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[p.role] || 'bg-slate-100 text-slate-600'}`}>
                {p.role}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">{preview}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="flex h-full w-full">
      {/* ── Left: conversation list ───────────────────────────────────────── */}
      <div className={`${mobileView === 'thread' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-slate-200 shrink-0 bg-white`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Eye size={16} className="text-slate-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700">All Conversations</span>
          <span className="ml-auto text-xs text-slate-400">{conversations.length} total</span>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 !text-black" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by user name or email…"
              className="w-full pl-8 pr-3 py-2 !text-black placeholder:text-black text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
              <Users size={28} />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            conversations.map((c) => <ConvoRow key={c._id} convo={c} />)
          )}
        </div>
      </div>

      {/* ── Right: read-only message thread ──────────────────────────────── */}
      <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col bg-slate-50`}>
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Eye size={40} className="opacity-40" />
            <p className="font-medium">Select a conversation to monitor</p>
            <p className="text-sm text-slate-400">Messages are read-only</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              {(selectedConvo.participants || []).map((p) => (
                <div key={p._id} className="flex items-center gap-1.5">
                  <img
                    src={p.profile?.avatarUrl || p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=32&background=2563eb&color=fff`}
                    alt={p.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[p.role] || ''}`}>{p.role}</span>
                </div>
              ))}
              {/* Read-only badge */}
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye size={11} /> Read-only
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-xs text-blue-600 font-medium px-4 py-1.5 bg-white rounded-full border border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1"
                  >
                    {loadingMore && <Loader2 size={12} className="animate-spin" />}
                    {loadingMore ? 'Loading…' : 'Load earlier messages'}
                  </button>
                </div>
              )}

              {msgLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={22} className="animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                  <p className="text-3xl">💬</p>
                  <p className="text-sm">No messages in this conversation yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg._id} message={msg} showSenderName />
                ))
              )}
            </div>

            {/* Read-only footer */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center gap-2 text-slate-400">
              <Eye size={16} />
              <span className="text-sm">You are viewing this conversation as an admin. You cannot send messages here.</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
