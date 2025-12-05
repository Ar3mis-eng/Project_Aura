import React, { useState, useRef, useEffect } from 'react'
import './MainForm.css'

// Messages component: simple mock messenger UI for student-counselor communication.
// - `onClose()` callback will be called to return to the main panels
// - no backend wired; messages are stored in local state as placeholders

export default function Messages({ onClose = () => {} }) {
  const [messages, setMessages] = useState([
    { id: 1, from: 'counselor', text: 'Hello — we reviewed your report. Are you okay?', time: '10:02' },
    { id: 2, from: 'student', text: 'I am okay, but I need help understanding next steps.', time: '10:05' },
  ])
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = () => {
    if (!text || text.trim() === '') return
    const next = { id: Date.now(), from: 'student', text: text.trim(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    setMessages(prev => [...prev, next])
    setText('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }

  const onInput = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    setText(el.value)
  }

  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="messages-title">Messages</div>
        <div className="messages-actions">
          <button className="btn-light" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="messages-list" ref={listRef}>
        {messages.map(m => (
          <div key={m.id} className={`message-item ${m.from === 'student' ? 'outgoing' : 'incoming'}`}>
            <div className="bubble">{m.text}</div>
            <div className="msg-time">{m.time}</div>
          </div>
        ))}
      </div>

      <div className="message-input-area">
        <textarea ref={inputRef} className="message-textarea" placeholder="Write a reply..." value={text} onChange={() => {}} onInput={onInput} />
        <button className="send-btn" type="button" onClick={send}>Send</button>
      </div>

      <div className="messages-note">Note: This is a local mockup. Hook up a backend to persist messages.</div>
    </div>
  )
}