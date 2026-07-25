import { useState } from 'react'
import { Search, MessageSquarePlus } from 'lucide-react'
import {Navigate} from 'react-router-dom'

const ROLE_COLORS = {
  student: 'bg-emerald-100 text-emerald-700',
  teacher: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

/**
 * ContactList — left panel showing searchable contacts and conversation previews.
 *
 * Props:
 *   contacts: User[]             — people this user can message
 *   conversations: Conversation[] — existing threads (for unread + last msg)
 *   selectedId: string           — currently open conversation id
 *   onSelectContact(user)        — called when a contact is clicked
 *   onSelectConversation(convo)  — called when a conversation is clicked
 *   role: 'student'|'teacher'|'admin'
 *   onAdminSearch(query: string) — admin-only: search all users
 *   adminSearchResults: User[]   — admin-only search results
 *   onAdminSelectUser(user)      — admin-only: start conversation from search
 *   loading: boolean
 */
export default function ContactList({
  contacts = [],
  conversations = [],
  selectedId,
  onSelectContact,
  onSelectConversation,
  role,
  onAdminSearch,
  adminSearchResults = [],
  onAdminSelectUser,
  loading,
}) {
  const [search, setSearch] = useState('')
  
  const handleSearch = (val) => {
    setSearch(val)
    if (role === 'admin') onAdminSearch?.(val)
  }

  // Build a map: contactId → conversation (for last msg + unread)
  const convoMap = {}
  conversations.forEach((c) => {
    const other = c.otherParticipant || c.participants?.find((p) => p._id !== undefined)
    if (other) convoMap[other._id] = c
  })

  const filteredContacts =
    role === 'admin' && search
      ? [] // admin search results shown separately
      : contacts.filter((c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
        )

  function ContactItem({ person, convo, onClick }) {
    const avatar =
      person?.profile?.avatarUrl ||
      person?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(person?.name || 'U')}&background=2563eb&color=fff&size=64`

    const lastMsg = convo?.lastMessage
    const unread = convo?.unreadCount || 0
    const isSelected = convo ? convo._id === selectedId : false

    const preview = lastMsg
      ? lastMsg.type === 'image'
        ? '📷 Image'
        : lastMsg.content?.slice(0, 45) + (lastMsg.content?.length > 45 ? '…' : '')
      : 'Start a conversation'

    const timeStr = convo?.lastMessageAt
      ? new Date(convo.lastMessageAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : ''

    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
          isSelected
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-slate-50 border border-transparent'
        }`}
      >
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={person?.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-semibold text-slate-800 truncate">{person?.name}</span>
            <span className="text-[11px] text-slate-400 shrink-0">{timeStr}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[person?.role] || 'bg-slate-100 text-slate-600'}`}
            >
              {person?.role}
            </span>
            <span className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              {preview}
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={role === 'admin' ? 'Search all users…' : 'Search contacts…'}
            className="w-full pl-9 pr-3 py-2 text-sm text-black placeholder:text-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Loading…
          </div>
        ) : (
          <>
            {/* Admin search results */}
            {role === 'admin' && search && adminSearchResults.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Search Results
                </p>
                {adminSearchResults.map((person) => (
                  <ContactItem
                    key={person._id}
                    person={person}
                    convo={convoMap[person._id]}
                    onClick={() => onAdminSelectUser?.(person)}
                  />
                ))}
                <div className="my-2 border-t border-slate-100" />
              </>
            )}

            {/* Existing conversations (admins see these as their contact list) */}
            {role === 'admin' && !search && conversations.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Recent
                </p>
                {conversations.map((convo) => (
                  <ContactItem
                    key={convo._id}
                    person={convo.otherParticipant}
                    convo={convo}
                    onClick={() => onSelectConversation?.(convo)}
                  />
                ))}
              </>
            )}

            {/* Students & Teachers: filtered contact list */}
            {role !== 'admin' && filteredContacts.length > 0 && (
              <>
                {filteredContacts.map((person) => (
                  <ContactItem
                    key={person._id}
                    person={person}
                    convo={convoMap[person._id]}
                    onClick={() => onSelectContact?.(person)}
                  />
                ))}
              </>
            )}

            {/* Empty states */}
            {role !== 'admin' && filteredContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                <MessageSquarePlus size={28} />
                <p className="text-sm text-center px-4">
                  {search ? 'No contacts match your search' : 'No contacts yet. Get started by joining a class!'}
                </p>
              </div>
            )}

            {role === 'admin' && !search && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                <MessageSquarePlus size={28} />
                <p className="text-sm text-center px-4">Search for a user to start a chat</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
