import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Eye } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import ContactList from '../components/chat/ContactList'
import ConversationPanel from '../components/chat/ConversationPanel'
import AdminMonitorPanel from '../components/chat/AdminMonitorPanel'
import toast from 'react-hot-toast'

/**
 * ChatPage — full-page chat UI.
 * For admins: tabbed layout with "My Chats" and "Monitor" tabs.
 * For others: two-panel contact list + conversation.
 */
export default function ChatPage() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const isAdmin = user?.role === 'admin'

  // Admin tab: 'my-chats' | 'monitor'
  const [adminTab, setAdminTab] = useState('my-chats')

  const [contacts, setContacts] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adminSearchResults, setAdminSearchResults] = useState([])
  const adminSearchTimer = useRef(null)

  // Mobile: which panel is visible
  const [mobileView, setMobileView] = useState('contacts') // 'contacts' | 'chat'

  // ── Load contacts and conversations ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [contactsRes, convosRes] = await Promise.all([
        api.get('/chat/contacts'),
        api.get('/chat/conversations'),
      ])
      setContacts(contactsRes.data.data || [])
      setConversations(convosRes.data.data || [])
    } catch {
      toast.error('Failed to load chat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Listen for incoming messages (to update conversation list) ───────────
  useEffect(() => {
    if (!socket) return
    const handler = ({ conversationId, message }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: message,
                lastMessageAt: message.createdAt,
                unreadCount:
                  selectedConversation?._id === conversationId
                    ? 0
                    : (c.unreadCount || 0) + 1,
              }
            : c
        )
      )
    }
    socket.on('new_message', handler)
    return () => socket.off('new_message', handler)
  }, [socket, selectedConversation])

  // ── Open a conversation for a contact ────────────────────────────────────
  const openConversation = async (person) => {
    try {
      const res = await api.post('/chat/conversations', { recipientId: person._id })
      const convo = res.data.data
      convo.otherParticipant = convo.participants?.find(
        (p) => p._id !== user?.id && p._id !== user?._id
      ) || person

      setSelectedConversation(convo)
      setMobileView('chat')

      setConversations((prev) => {
        if (prev.find((c) => c._id === convo._id)) return prev
        return [{ ...convo, unreadCount: 0 }, ...prev]
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open conversation')
    }
  }

  // ── Admin user search ─────────────────────────────────────────────────────
  const handleAdminSearch = (query) => {
    clearTimeout(adminSearchTimer.current)
    if (!query.trim()) {
      setAdminSearchResults([])
      return
    }
    adminSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/chat/contacts?search=${encodeURIComponent(query)}`)
        setAdminSearchResults(res.data.data || [])
      } catch {}
    }, 300)
  }

  // ── Mark conversation as read when selected ───────────────────────────────
  const handleSelectConversation = (convo) => {
    setSelectedConversation(convo)
    setMobileView('chat')
    setConversations((prev) =>
      prev.map((c) => (c._id === convo._id ? { ...c, unreadCount: 0 } : c))
    )
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100">

      {/* ── Admin tabs (only shown to admin) ─────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setAdminTab('my-chats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              adminTab === 'my-chats'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare size={15} />
            My Chats
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold bg-white text-blue-600 px-1.5 py-0.5 rounded-full leading-none">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('monitor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              adminTab === 'monitor'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye size={15} />
            Monitor All
          </button>
        </div>
      )}

      {/* ── Monitor tab (admin only) ──────────────────────────────────────── */}
      {isAdmin && adminTab === 'monitor' ? (
        <div className="flex flex-1 overflow-hidden">
          <AdminMonitorPanel />
        </div>
      ) : (
        /* ── Normal chat layout (My Chats) ───────────────────────────────── */
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div
            className={`
              ${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex
              flex-col w-full md:w-80 lg:w-96
              bg-white border-r border-slate-200 shrink-0
            `}
          >
            <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-200">
              <MessageSquare size={20} className="text-blue-600" />
              <h1 className="text-base font-bold text-slate-800">Messages</h1>
              {totalUnread > 0 && (
                <span className="ml-auto text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>

            <ContactList
              contacts={contacts}
              conversations={conversations}
              selectedId={selectedConversation?._id}
              onSelectContact={openConversation}
              onSelectConversation={handleSelectConversation}
              role={user?.role}
              onAdminSearch={handleAdminSearch}
              adminSearchResults={adminSearchResults}
              onAdminSelectUser={openConversation}
              loading={loading}
            />
          </div>

          {/* Right panel */}
          <div
            className={`
              ${mobileView === 'contacts' ? 'hidden' : 'flex'} md:flex
              flex-1 flex-col
            `}
          >
            <ConversationPanel
              conversation={selectedConversation}
              onBack={() => setMobileView('contacts')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
