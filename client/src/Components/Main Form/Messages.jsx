import React, { useState, useRef, useEffect } from 'react'
import './MainForm.css'

// Messages component: student-teacher communication using threads API
// - `onClose()` callback will be called to return to the main panels
// - Now connected to backend API for real messaging

export default function Messages({ onClose = () => {} }) {
  const getApiBase = () => {
    const stored = localStorage.getItem('apiBase')
    return stored && stored.trim() ? stored.trim() : 'http://127.0.0.1:8000'
  }

  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)
  
  // Compose new message
  const [showCompose, setShowCompose] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [compose, setCompose] = useState({ recipientId: null, subject: '', body: '' })

  const fetchThreads = async () => {
    try {
      setLoading(true)
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
      setError(e.message || 'Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return
      const base = getApiBase()
      const res = await fetch(`${base}/api/teachers`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load teachers')
      const data = await res.json()
      setTeachers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (e) {
      console.error('Error loading teachers:', e)
    }
  }

  const startCompose = () => {
    setCompose({ recipientId: null, subject: '', body: '' })
    setShowCompose(true)
    if (teachers.length === 0) fetchTeachers()
  }

  const sendNewMessage = async () => {
    if (!compose.recipientId || !compose.subject || !compose.body) {
      alert('Please fill in all fields')
      return
    }
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      // Create new thread
      const threadRes = await fetch(`${base}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept:'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: compose.subject, participant_ids: [compose.recipientId] })
      })
      if (!threadRes.ok) throw new Error('Failed to create conversation')
      const thread = await threadRes.json()
      // Send first message
      const msgRes = await fetch(`${base}/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept:'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: compose.body })
      })
      if (!msgRes.ok) throw new Error('Failed to send message')
      setCompose({ recipientId: null, subject: '', body: '' })
      setShowCompose(false)
      await fetchThreads()
    } catch (e) {
      alert(e.message || 'Error sending message')
    }
  }

  const fetchMessages = async (threadId) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads/${threadId}/messages`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      setMessages(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (e) {
      setError(e.message || 'Error loading messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [])

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id)
    }
  }, [selectedThread])

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    if (!text || text.trim() === '' || !selectedThread) return
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
        body: JSON.stringify({ body: text.trim() })
      })
      if (!res.ok) throw new Error('Failed to send message')
      setText('')
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
      await fetchMessages(selectedThread.id)
    } catch (e) {
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
      return user.id
    } catch {
      return null
    }
  }

  const currentUserId = getCurrentUserId()

  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="messages-title">Messages</div>
        <div className="messages-actions">
          <button className="btn-primary" onClick={startCompose} style={{marginRight:'0.5rem'}}>New Message</button>
          <button className="btn-light" onClick={onClose}>Close</button>
        </div>
      </div>

      {showCompose ? (
        <div className="compose-view" style={{padding:'1.5rem'}}>
          <h3 style={{marginBottom:'1rem'}}>New Message</h3>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block', marginBottom:'0.25rem', fontWeight:'500'}}>To (Teacher/Counselor)</label>
            <select 
              value={compose.recipientId||''} 
              onChange={e => setCompose(c=>({...c, recipientId: parseInt(e.target.value)}))}
              style={{width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem'}}
            >
              <option value="">Select a teacher or counselor</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} {t.email ? `(${t.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block', marginBottom:'0.25rem', fontWeight:'500'}}>Subject</label>
            <input 
              value={compose.subject} 
              onChange={e => setCompose(c=>({...c, subject: e.target.value}))}
              placeholder="Enter subject"
              style={{width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem'}}
            />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block', marginBottom:'0.25rem', fontWeight:'500'}}>Message</label>
            <textarea 
              value={compose.body} 
              onChange={e => setCompose(c=>({...c, body: e.target.value}))}
              placeholder="Type your message here..."
              rows={8}
              style={{width:'100%', padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:'0.375rem'}}
            />
          </div>
          <div style={{display:'flex', gap:'0.5rem'}}>
            <button className="btn-primary" onClick={sendNewMessage}>Send</button>
            <button className="btn-light" onClick={() => {
              setShowCompose(false)
              setCompose({ recipientId: null, subject: '', body: '' })
            }}>Cancel</button>
          </div>
        </div>
      ) : !selectedThread ? (
        <div className="threads-list">
          {loading && <div className="empty">Loading conversations...</div>}
          {error && <div className="empty" style={{color:'#b91c1c'}}>{error}</div>}
          {!loading && !error && threads.length === 0 && (
            <div className="empty">No conversations yet. Contact your teacher or counselor to start a conversation.</div>
          )}
          {!loading && threads.map(t => {
            const participants = Array.isArray(t.participants) 
              ? t.participants.map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ') 
              : ''
            const lastMsg = Array.isArray(t.messages) && t.messages.length > 0 ? t.messages[0].body : ''
            return (
              <div key={t.id} className="thread-item" onClick={() => setSelectedThread(t)} style={{padding:'1rem', borderBottom:'1px solid #e5e7eb', cursor:'pointer'}}>
                <div style={{fontWeight:'600', marginBottom:'0.25rem'}}>{t.subject}</div>
                <div style={{fontSize:'0.875rem', color:'#6b7280', marginBottom:'0.25rem'}}>{participants}</div>
                {lastMsg && <div style={{fontSize:'0.875rem', color:'#9ca3af'}}>{lastMsg.slice(0, 60)}{lastMsg.length > 60 ? '...' : ''}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="conversation-header" style={{padding:'1rem', borderBottom:'1px solid #e5e7eb', background:'#f9fafb'}}>
            <button className="btn-light" onClick={() => setSelectedThread(null)} style={{marginBottom:'0.5rem'}}>← Back to conversations</button>
            <div style={{fontWeight:'600'}}>{selectedThread.subject}</div>
            <div style={{fontSize:'0.875rem', color:'#6b7280'}}>
              {Array.isArray(selectedThread.participants) 
                ? selectedThread.participants.map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ')
                : ''}
            </div>
          </div>

          <div className="messages-list" ref={listRef}>
            {loading && <div className="empty">Loading messages...</div>}
            {!loading && messages.map(m => {
              const from = m.from ? `${m.from.first_name||''} ${m.from.last_name||''}`.trim() : 'Unknown'
              const isOutgoing = m.from_user_id === currentUserId
              return (
                <div key={m.id} className={`message-item ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                  <div className="bubble">
                    {!isOutgoing && <div style={{fontWeight:'600', fontSize:'0.75rem', marginBottom:'0.25rem', color:'#4b5563'}}>{from}</div>}
                    {m.body}
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