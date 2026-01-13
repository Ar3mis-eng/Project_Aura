import React, { useState, useRef, useEffect } from 'react'
import './MainForm.css'

// Messages component: student-teacher communication using threads API
// - `onClose()` callback will be called to return to the main panels
// - Now connected to backend API for real messaging

export default function Messages({ onClose = () => {} }) {
  const getApiBase = () => {
    const stored = localStorage.getItem('apiBase')
    return stored && stored.trim() ? stored.trim() : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000')
  }

  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const fetchThreads = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) { setError('Not authenticated'); return }
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load conversations')
      const data = await res.json()
      setThreads(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (e) {
      if (!silent) setError(e.message || 'Error loading conversations')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchMessages = async (threadId, silent = false) => {
    try {
      if (!silent) setLoading(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads/${threadId}/messages`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      const fetchedMessages = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Preserve optimistic messages (temporary ones being sent)
      setMessages(prev => {
        const optimisticMessages = prev.filter(m => m.id && m.id.toString().startsWith('temp-'))
        // Merge: keep optimistic messages, add fetched messages that aren't duplicates
        const fetchedIds = new Set(fetchedMessages.map(m => m.id))
        const merged = [...fetchedMessages, ...optimisticMessages.filter(om => !fetchedIds.has(om.id))]
        return merged
      })
    } catch (e) {
      if (!silent) setError(e.message || 'Error loading messages')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      fetchThreads(true) // silent mode
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id, true) // silent on initial load
      // Poll for new messages in thread every 5 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedThread.id, true) // silent mode
      }, 5000)
      return () => clearInterval(interval)
    } else {
      // Clear messages when no thread selected
      setMessages([])
    }
  }, [selectedThread])

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    if (!text || text.trim() === '' || !selectedThread) return
    
    const messageText = text.trim()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = currentUser.id || currentUser.user_id || currentUser.userId
    
    // Optimistic UI: Add message immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      body: messageText,
      from_user_id: currentUserId,
      from: {
        id: currentUserId,
        first_name: currentUser.first_name || currentUser.name || 'You',
        last_name: currentUser.last_name || ''
      },
      created_at: new Date().toISOString(),
      sending: true
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setText('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: messageText })
      })
      if (!res.ok) throw new Error('Failed to send message')
      
      const data = await res.json()
      const newMessage = data?.data || data
      
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? newMessage : m
      ))
      // Refresh threads list to update conversation preview
      fetchThreads(true)
    } catch (e) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      alert('Error sending message: ' + e.message)
    }
  }

  const onInput = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    setText(el.value)
  }

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      console.log('Current user from localStorage:', user)
      // Try different possible ID fields
      const userId = user.id || user.user_id || user.userId
      return userId ? parseInt(userId) : null
    } catch {
      return null
    }
  }

  const currentUserId = getCurrentUserId()

  // Filter threads based on search query
  const filteredThreads = threads.filter(t => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
    
    // Search in participants names
    const participantNames = Array.isArray(t.participants)
      ? t.participants
          .filter(p => p.id !== currentUserId)
          .map(p => `${p.first_name||''} ${p.last_name||''}`.toLowerCase())
          .join(' ')
      : ''
    
    // Search in subject
    const subject = (t.subject || '').toLowerCase()
    
    // Search in last message
    const lastMsg = Array.isArray(t.messages) && t.messages.length > 0 
      ? (t.messages[0].body || '').toLowerCase() 
      : ''
    
    return participantNames.includes(query) || subject.includes(query) || lastMsg.includes(query)
  })

  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="messages-title">Messages</div>
        {!selectedThread && (
          <div className="messages-actions">
            <button className="btn-light" onClick={onClose}>Close</button>
          </div>
        )}
      </div>

      {!selectedThread ? (
        <div className="threads-list">
          <div style={{padding:'1rem', borderBottom:'1px solid #e5e7eb'}}>
            <input 
              className="msg-search" 
              placeholder="Search conversations..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              style={{width:'100%', padding:'0.5rem 0.65rem', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'0.9rem'}}
            />
          </div>
          {loading && <div className="empty">Loading conversations...</div>}
          {error && <div className="empty" style={{color:'#b91c1c'}}>{error}</div>}
          {!loading && !error && filteredThreads.length === 0 && threads.length > 0 && (
            <div className="empty">No conversations match your search.</div>
          )}
          {!loading && !error && threads.length === 0 && (
            <div className="empty">No conversations yet. Your teacher or counselor will contact you when needed.</div>
          )}
          {!loading && filteredThreads.map(t => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
            const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
            const participants = Array.isArray(t.participants) 
              ? t.participants
                  .filter(p => p.id !== currentUserId)
                  .map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ') 
              : ''
            const lastMsg = Array.isArray(t.messages) && t.messages.length > 0 ? t.messages[0].body : ''
            const hasUnread = t.unread_count && t.unread_count > 0
            return (
              <div key={t.id} className={`thread-item ${hasUnread ? 'has-unread' : ''}`} onClick={() => setSelectedThread(t)}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.25rem'}}>
                  <div style={{fontWeight: hasUnread ? '700' : '600'}}>{participants || 'Unknown'}</div>
                  {hasUnread && (
                    <span style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      minWidth: '1.25rem',
                      textAlign: 'center'
                    }}>
                      {t.unread_count}
                    </span>
                  )}
                </div>
                <div style={{fontSize:'0.875rem', color:'#6b7280', marginBottom:'0.25rem'}}>{t.subject}</div>
                {lastMsg && <div style={{fontSize:'0.875rem', color: hasUnread ? '#374151' : '#9ca3af', fontWeight: hasUnread ? '500' : '400'}}>{lastMsg.slice(0, 60)}{lastMsg.length > 60 ? '...' : ''}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="conversation-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
              <button className="btn-light" onClick={() => { setSelectedThread(null); fetchThreads(true); }}>← Back</button>
              <div style={{fontWeight:'600', fontSize:'1.1rem'}}>
                {Array.isArray(selectedThread.participants) 
                  ? selectedThread.participants
                      .filter(p => p.id !== currentUserId)
                      .map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ')
                  : ''}
              </div>
            </div>
          </div>

          <div className="messages-list" ref={listRef}>
            {loading && <div className="empty">Loading messages...</div>}
            {!loading && messages.map(m => {
              const from = m.from ? `${m.from.first_name||''} ${m.from.last_name||''}`.trim() : 'Unknown'
              const isOutgoing = currentUserId && m.from_user_id && parseInt(m.from_user_id) === currentUserId
              const isUnread = !isOutgoing && m.is_read === false
              console.log('Message:', { 
                body: m.body, 
                from_user_id: m.from_user_id, 
                from_id: m.from?.id,
                currentUserId, 
                isOutgoing,
                is_read: m.is_read,
                isUnread,
                message: m
              })
              return (
                <div key={m.id} className={`message-item ${isOutgoing ? 'outgoing' : 'incoming'} ${isUnread ? 'unread' : ''}`}>
                  <div className="bubble" style={isUnread ? {backgroundColor: '#dbeafe', borderLeft: '3px solid #3b82f6'} : {}}>
                    <div style={{fontWeight:'600', fontSize:'0.7rem', marginBottom:'0.25rem', color: isOutgoing ? '#e0e7ff' : '#4b5563'}}>{from}</div>
                    <div>{m.body}</div>
                  </div>
                  <div className="msg-time">{m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                </div>
              )
            })}
          </div>

          <div className="message-input-area">
            <textarea ref={inputRef} className="message-textarea" placeholder="Write a reply..." value={text} onChange={() => {}} onInput={onInput} />
            <button className="send-btn" type="button" onClick={send}>Send</button>
          </div>
        </>
      )}
    </div>
  )
}