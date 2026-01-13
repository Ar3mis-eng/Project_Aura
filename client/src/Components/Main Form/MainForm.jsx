import React, { useState, useEffect } from 'react'
import './MainForm.css'
import AbuseReport from './AbuseReport'
import TeacherForms from './TeacherForms'
import { IoLogOutOutline } from 'react-icons/io5'
import { FaRegMessage } from 'react-icons/fa6'
import Messages from './Messages'

// MainForm renders two panels: Student Form and Teacher Form.
// Panels are hidden by default; future login logic should add the
// `active` class to the appropriate panel or render MainForm with a
// `role` prop ("student" | "teacher") to show the correct panel.
export default function MainForm({ role = null, header = null, onLogout = () => {} }) {
  // header: { logo: string, title: string }
  const [showSurvey, setShowSurvey] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [introShown, setIntroShown] = useState(false)

  // Auto-show survey (with intro slides) for students on every login
  useEffect(() => {
    if (role === 'student' || role === 'both') {
      setShowSurvey(true)
    }
  }, [role])

  const getApiBase = () => {
    const stored = localStorage.getItem('apiBase')
    return stored && stored.trim() ? stored.trim() : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000')
  }

  // Fetch unread message count for students
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      const threads = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const totalUnread = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0)
      setUnreadCount(totalUnread)
    } catch (e) {
      console.error('Error fetching unread count:', e)
    }
  }

  useEffect(() => {
    if (role === 'student' || role === 'both') {
      fetchUnreadCount()
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [role])

  // Refresh unread count when messages are closed
  useEffect(() => {
    if (!showMessages && (role === 'student' || role === 'both')) {
      fetchUnreadCount()
    }
  }, [showMessages])
  const renderHeader = () => {
    if (!header) return null
    const titleLines = header.title.split('\n')
    return (
      <div className="mainform-header">
        <img src={header.logo} alt="logo" className="panel-logo" />
        <div className="panel-title-inner">
          {titleLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <div className="header-actions">
          {role !== 'teacher' && (
            <button className="message-btn" title="Messages" type="button" onClick={() => { setShowMessages(true); setShowSurvey(false); }} style={{position:'relative'}}>
              <FaRegMessage />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  border: '2px solid white'
                }} />
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    try {
      if (typeof onLogout === 'function') onLogout()
    } catch (e) {
      console.log('logout', e)
    }
  }

  return (
    <div className="mainform-container">
      {renderHeader()}
      {/* show survey when requested. For teacher role, show TeacherForms instead of AbuseReport */}
      {showSurvey && !showMessages && (
        <div className="panel survey-panel active">
          {role === 'teacher' ? (
            <TeacherForms onLogout={onLogout} />
          ) : (
            <AbuseReport 
              showIntro={!introShown}
              onFinish={(data) => {
                console.log('Report submitted', data);
                alert('Report submitted successfully.');
                setShowSurvey(false);
              }} 
              onCancel={() => {
                setIntroShown(true);
                setShowSurvey(false);
              }} 
            />
          )}
        </div>
      )}

      {/* messages view - only show for student role */}
      {showMessages && role !== 'teacher' && (
        <div className="panel messages-panel active">
          <Messages onClose={() => setShowMessages(false)} />
        </div>
      )}
      {!showSurvey && !showMessages && (
        <div id="student-panel" className={`panel student-panel ${(role === 'student' || role === 'both') ? 'active' : ''}`}>
          <div className="panel-top">
            <h2>Student Form</h2>
          </div>
          <div className="panel-body">
            <button className="report-btn" type="button" onClick={() => setShowSurvey(true)}>Want to report abuse?</button>
          </div>
          
        </div>
      )}

      <div id="teacher-panel" className={`panel teacher-panel ${(role === 'teacher' || role === 'both') ? 'active' : ''}`}>
        <TeacherForms onLogout={handleLogout} />
      </div>
      {/* floating logout button (outside panels and header) */}
      <button className="floating-logout" type="button" onClick={handleLogout} aria-label="Logout">
        <IoLogOutOutline style={{ verticalAlign: 'middle', marginRight: 8 }} /> Logout
      </button>
    </div>
  )
}
