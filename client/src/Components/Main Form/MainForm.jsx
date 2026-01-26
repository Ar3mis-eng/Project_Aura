import React, { useState, useEffect } from 'react'
import './MainForm.css'
import AbuseReport from './AbuseReport'
import TeacherForms from './TeacherForms'
import { IoLogOutOutline } from 'react-icons/io5'
import { FaRegMessage } from 'react-icons/fa6'
import { FaFileArchive, FaArrowLeft } from 'react-icons/fa'
import Messages from './Messages'

// MainForm renders two panels: Student Form and Teacher Form.
// Panels are hidden by default; future login logic should add the
// `active` class to the appropriate panel or render MainForm with a
// `role` prop ("student" | "teacher") to show the correct panel.
export default function MainForm({ role = null, header = null, onLogout = () => {} }) {
  // header: { logo: string, title: string }
  const [showSurvey, setShowSurvey] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [introShown, setIntroShown] = useState(false)
  const [myReports, setMyReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [questionSetsMap, setQuestionSetsMap] = useState({})

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

  // Fetch student's own reports
  const fetchMyReports = async () => {
    try {
      setReportsLoading(true)
      setReportsError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setReportsError('Not authenticated')
        return
      }
      const base = getApiBase()
      const res = await fetch(`${base}/api/reports`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error('Failed to load reports')
      }
      const data = await res.json()
      const reportsList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setMyReports(reportsList)
    } catch (e) {
      setReportsError(e.message || 'Error loading reports')
    } finally {
      setReportsLoading(false)
    }
  }

  // Fetch reports when archive is opened
  useEffect(() => {
    if (showReports && role === 'student') {
      fetchMyReports()
      fetchQuestionSets()
    }
  }, [showReports, role])

  // Load question sets to display full questions
  const fetchQuestionSets = async () => {
    try {
      const base = getApiBase()
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const res = await fetch(`${base}/api/question-sets`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      })
      if (!res.ok) return
      const data = await res.json()
      const map = {}
      for (const item of data) {
        if (item && item.key && Array.isArray(item.schema)) {
          map[item.key] = item.schema
        }
      }
      setQuestionSetsMap(map)
    } catch (e) {
      console.error('Error loading question sets:', e)
    }
  }

  // Get full question text from question ID
  const getQuestionText = (questionId, reportType) => {
    const schema = questionSetsMap[reportType]
    if (!schema) return questionId
    const question = schema.find(q => q.id === questionId)
    return question ? question.q : questionId
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
            <>
              <button className="message-btn" title="My Reports" type="button" onClick={() => { setShowReports(true); setShowMessages(false); setShowSurvey(false); }} style={{marginRight: '10px'}}>
                <FaFileArchive />
              </button>
              <button className="message-btn" title="Messages" type="button" onClick={() => { setShowMessages(true); setShowSurvey(false); setShowReports(false); }} style={{position:'relative'}}>
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
            </>
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

      {/* My Reports view - only show for student role */}
      {showReports && role !== 'teacher' && (
        <div className="panel messages-panel active">
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedReport && (
                  <button
                    onClick={() => setSelectedReport(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#374151',
                      padding: '5px'
                    }}
                    title="Back to list"
                  >
                    <FaArrowLeft />
                  </button>
                )}
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
                  {selectedReport ? 'Report Details' : 'My Reports'}
                </h2>
              </div>
              <button
                onClick={() => { setShowReports(false); setSelectedReport(null); }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              {reportsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading your reports...
                </div>
              ) : reportsError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                  {reportsError}
                </div>
              ) : selectedReport ? (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Report Type</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>{selectedReport.type}</div>
                    </div>
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: selectedReport.status === 'submitted' ? '#dbeafe' : '#d1fae5',
                        color: selectedReport.status === 'submitted' ? '#1e40af' : '#065f46'
                      }}>
                        {selectedReport.status}
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Submitted</div>
                      <div style={{ fontSize: '1rem', color: '#374151' }}>
                        {new Date(selectedReport.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Responses</div>
                      {selectedReport.answers && Object.entries(selectedReport.answers).map(([questionId, answer], idx) => (
                        <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                            {getQuestionText(questionId, selectedReport.type)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {Array.isArray(answer) ? answer.join(', ') : answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : myReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FaFileArchive style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }} />
                  <div style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '8px' }}>
                    No reports yet
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    Your submitted reports will appear here
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {myReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      style={{
                        background: 'white',
                        padding: '16px',
                        marginBottom: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '1px solid #e5e7eb'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                          {report.type} Abuse Report
                        </div>
                        <div style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: report.status === 'submitted' ? '#dbeafe' : '#d1fae5',
                          color: report.status === 'submitted' ? '#1e40af' : '#065f46'
                        }}>
                          {report.status}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                      </div>
                      {report.answers && (
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
                          {Object.keys(report.answers).length} response(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!showSurvey && !showMessages && !showReports && (
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
