import React, { useState } from 'react'
import './MainForm.css'
import AbuseReport from './AbuseReport'
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
          <button className="message-btn" title="Messages" type="button" onClick={() => { setShowMessages(true); setShowSurvey(false); }}>
            <FaRegMessage />
          </button>
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
      {/* show survey when requested */}
      {showSurvey && !showMessages && (
        <div className="panel survey-panel active">
          <AbuseReport onFinish={(data) => { console.log('report done', data); setShowSurvey(false); }} onCancel={() => setShowSurvey(false)} />
        </div>
      )}

      {/* messages view */}
      {showMessages && (
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
        <div className="panel-top">
          <h2>Teacher Form</h2>
        </div>
        <p className="panel-note">Placeholder fields for teacher submissions. Replace with real inputs later.</p>
        <div className="panel-field">Employee ID: <span className="placeholder">[employee_id field]</span></div>
        <div className="panel-field">Name: <span className="placeholder">[teacher_name field]</span></div>
        <div className="panel-field">Department: <span className="placeholder">[department field]</span></div>
        
      </div>
      {/* floating logout button (outside panels and header) */}
      <button className="floating-logout" type="button" onClick={handleLogout} aria-label="Logout">
        <IoLogOutOutline style={{ verticalAlign: 'middle', marginRight: 8 }} /> Logout
      </button>
    </div>
  )
}
