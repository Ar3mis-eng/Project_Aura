import React, { useState, useEffect, useRef } from 'react'
import './TeacherForms.css'
import { IoMdMenu } from 'react-icons/io'
import logo from '../Login/media/logo.png'

export default function TeacherForms({ onLogout = () => {} }) {
  const getApiBase = () => {
    const stored = localStorage.getItem('apiBase')
    return stored && stored.trim() ? stored.trim() : 'http://127.0.0.1:8000'
  }
  const [view, setView] = useState(null) // null = welcome, or 'reports', 'messages', 'add', 'settings', 'students'
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Messages CRUD
  const [messages, setMessages] = useState(() => {
    try { const raw = localStorage.getItem('teacher_messages'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const [compose, setCompose] = useState({ id: null, recipient: '', subject: '', body: '', label: '' })
  const [editingId, setEditingId] = useState(null)

  // Reports list from backend (fallback to local cache)
  const [reports, setReports] = useState(() => {
    try { const raw = localStorage.getItem('teacher_reports'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Settings / profile
  const [profile, setProfile] = useState(() => {
    try { const raw = localStorage.getItem('teacher_profile'); return raw ? JSON.parse(raw) : { name:'', email:'', teacherId:'', img:'' } } catch { return { name:'', email:'', teacherId:'', img:'' } }
  })
  const [passwords, setPasswords] = useState({ current:'', new:'', confirm:'' })

  // Add questionnaire
  const [newType, setNewType] = useState('')
  const [newQuestions, setNewQuestions] = useState([])
  const qTextRef = useRef(null)
  const [customSets, setCustomSets] = useState(() => {
    try { const raw = localStorage.getItem('customQuestionSets'); return raw ? JSON.parse(raw) : {} } catch { return {} }
  })
  const [availableTypes, setAvailableTypes] = useState([])
  const [typesError, setTypesError] = useState('')
  const [remoteSets, setRemoteSets] = useState([])
  const [editQS, setEditQS] = useState({ open:false, setId:null, setKey:'', index:-1, qItem:null })

  useEffect(() => {
    if (view !== 'add') return
    let cancelled = false
    const run = async () => {
      try {
        setTypesError('')
        const base = getApiBase()
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        const res = await fetch(`${base}/api/question-sets`, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
        })
        if (!res.ok) throw new Error('Failed to load question sets')
        const data = await res.json()
        const keys = Array.isArray(data) ? data.filter(it => it && it.key).map(it => it.key) : []
        if (!cancelled) {
          setRemoteSets(Array.isArray(data) ? data : [])
          setAvailableTypes(keys)
          if (!newType && keys.length) setNewType(keys[0])
        }
      } catch (e) {
        if (!cancelled) {
          setAvailableTypes([])
          setRemoteSets([])
          setTypesError('Unable to load abuse types')
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [view])

  // Student Management
  const [studentForm, setStudentForm] = useState({ first_name:'', middle_name:'', last_name:'', age:'', birthday:'', contact_number:'', address:'', email:'', password:'', confirm:'' })
  const [studentStatus, setStudentStatus] = useState('')
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const filteredStudents = students.filter(s => {
    const q = studentQuery.toLowerCase();
    const name = `${s.first_name||''} ${s.last_name||''}`.toLowerCase();
    const email = (s.email||'').toLowerCase();
    return !q || name.includes(q) || email.includes(q);
  })
  const [editStudent, setEditStudent] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true); setStudentsError('')
      const token = localStorage.getItem('authToken')
      if (!token) { setStudentsLoading(false); setStudentsError('Not authenticated'); return }
      const res = await fetch('http://127.0.0.1:8000/api/students', {
        headers: { 'Accept':'application/json', 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        const msg = await res.json().catch(()=>({}))
        throw new Error(msg.message || 'Failed to load students')
      }
      const data = await res.json()
      setStudents(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (e) {
      setStudentsError(e.message || 'Error')
    } finally {
      setStudentsLoading(false)
    }
  }

  useEffect(() => { if (view === 'students') fetchStudents() }, [view])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { localStorage.setItem('teacher_messages', JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem('teacher_reports', JSON.stringify(reports)) }, [reports])
  useEffect(() => { localStorage.setItem('teacher_profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('customQuestionSets', JSON.stringify(customSets)) }, [customSets])

  // Messages handlers
  const [showCompose, setShowCompose] = useState(false)
  const [messagesMenuOpen, setMessagesMenuOpen] = useState(false)
  const messagesMenuRef = useRef(null)
  const [folder, setFolder] = useState('Inbox')
  const startCompose = () => { setCompose({ id: Date.now(), recipient:'', subject:'', body:'', label:'' }); setEditingId(null); setSelectedMessageId(null); setView('messages'); setShowCompose(true) }
  const saveMessage = () => {
    if (!compose.recipient || !compose.subject) return
    if (editingId) {
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, ...compose } : m))
      setEditingId(null)
    } else {
      setMessages(prev => [...prev, { ...compose, id: compose.id }])
    }
    setCompose({ id: null, recipient:'', subject:'', body:'', label:'' })
    setShowCompose(false)
  }
  const editMessage = (id) => { const m = messages.find(x=>x.id===id); if (m) { setCompose(m); setEditingId(id); setShowCompose(true); setView('messages') } }
  const deleteMessage = (id) => { setMessages(prev => prev.filter(m => m.id !== id)) }
  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const selectMessage = (id) => { setSelectedMessageId(id); setView('messages') }
  // ensure menu closes when selecting
  const selectMessageMobile = (id) => { setSelectedMessageId(id); setView('messages'); setShowMenu(false) }
  const toggleLabelColor = (id) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== id) return m
      const next = m._color === 'yellow' ? 'green' : m._color === 'green' ? 'red' : m._color === 'red' ? null : 'yellow'
      return { ...m, _color: next }
    }))
  }
  const setLabelName = (id, name) => { setMessages(prev => prev.map(m => m.id===id ? { ...m, label: name } : m)) }

  // Reports handlers
  const deleteReport = (id) => { setReports(prev => prev.filter(r => r.id !== id)) }

  const fetchReports = async () => {
    try {
      setReportsLoading(true); setReportsError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) { setReportsLoading(false); setReportsError('Not authenticated'); return }
      const base = getApiBase()
      const res = await fetch(`${base}/api/reports`, { headers: { Accept:'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const msg = await res.json().catch(()=>({}))
        throw new Error(msg.message || 'Failed to load reports')
      }
      const data = await res.json()
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setReports(list)
    } catch (e) {
      setReportsError(e.message || 'Error')
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => { if (view === 'reports') fetchReports() }, [view])

  // Report detail view (modal)
  const [viewingReport, setViewingReport] = useState(null)
  const [reportDetailLoading, setReportDetailLoading] = useState(false)
  const [reportDetailError, setReportDetailError] = useState('')
  const openReport = async (r) => {
    try {
      setReportDetailLoading(true); setReportDetailError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/question-sets`, { headers: { Accept:'application/json', Authorization: token ? `Bearer ${token}` : undefined } })
      if (!res.ok) throw new Error('Failed to load questions')
      const sets = await res.json()
      const match = Array.isArray(sets) ? sets.find(s => s && s.key === r.type) : null
      setViewingReport({ report: r, questions: Array.isArray(match?.schema) ? match.schema : [] })
    } catch (e) {
      setViewingReport({ report: r, questions: [] })
      setReportDetailError(e.message || 'Unable to load questions')
    } finally {
      setReportDetailLoading(false)
    }
  }

  // Add questionnaire handlers
  const addQuestionLine = () => {
    setNewQuestions(prev => [...prev, { id: Date.now(), q:'', type:'text', required: true, options:'' }])
  }
  const updateQuestionLine = (id, patch) => {
    setNewQuestions(prev => prev.map(q => q.id===id ? { ...q, ...patch } : q))
  }
  const removeQuestionLine = (id) => setNewQuestions(prev => prev.filter(q => q.id !== id))
  const saveQuestionSet = () => {
    if (!newType) return
    const formatted = newQuestions.map(q => {
      const base = { id: `${newType}_${Math.random().toString(36).slice(2,8)}`, q: q.q || '', type: q.type, required: q.required }
      if (q.type === 'choice') base.options = q.options.split(',').map(s=>s.trim()).filter(Boolean)
      return base
    })
    setCustomSets(prev => ({ ...prev, [newType]: formatted }))
    setNewType(''); setNewQuestions([])
    setView('add')
  }
  const removeCustomSet = (key) => { const c = { ...customSets }; delete c[key]; setCustomSets(c) }

  const handleMenuSelect = (viewName) => {
    setView(viewName)
    setShowMenu(false)
  }

  const handleFolderSelect = (f) => {
    setFolder(f)
    setMessagesMenuOpen(false)
    setSelectedMessageId(null)
  }

  const [search, setSearch] = useState('')

  // Profile edit mode
  const [editingProfile, setEditingProfile] = useState(false)
  const profileImageRef = useRef(null)

  // close menu when view changes or on resize (prevents it from sticking)
  useEffect(() => {
    setShowMenu(false)
  }, [view])

  // close menu on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close messages menu when clicking outside
  useEffect(() => {
    const h = (e) => { if (messagesMenuRef.current && !messagesMenuRef.current.contains(e.target)) setMessagesMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // track mobile breakpoint to change message behavior
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const calc = () => setIsMobile(window.innerWidth < 1000)
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  return (
    <div className="teacher-root">
      <div className="teacher-main">
        <header className="teacher-header">
          <h2>Teacher Dashboard</h2>
          <div className="teacher-header-actions">
            <div className="menu-wrapper" ref={menuRef}>
              <button className="menu-toggle" onClick={() => setShowMenu(!showMenu)}>
                <IoMdMenu />
              </button>
              {showMenu && (
                <div className="menu-dropdown">
                  <button onClick={() => handleMenuSelect('reports')}>Report Submitted</button>
                  <button onClick={() => handleMenuSelect('messages')}>Messages</button>
                  <button onClick={() => handleMenuSelect('students')}>Student Management</button>
                  <button onClick={() => handleMenuSelect('add')}>Add Questionnaire</button>
                  <button onClick={() => handleMenuSelect('settings')}>Settings</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="teacher-content">
          {/* Welcome landing page */}
          {view === null && (
            <div className="welcome-pane">
              <div className="welcome-inner">
                <h1>Welcome Teachers</h1>
                <p>Select an option from the menu to get started.</p>
              </div>
            </div>
          )}

          {/* Desktop sidebar menu */}
          <aside className="teacher-sidebar">
            <nav>
              <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}>Report Submitted</button>
              <button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}>Messages</button>
              <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>Student Management</button>
              <button className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}>Add Questionnaire</button>
              <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
              <button className="compose-btn-sidebar" onClick={startCompose}>Compose</button>
              <button className="logout-btn" onClick={() => onLogout()}>Logout</button>
            </nav>
          </aside>

          {/* Main content panel */}
          {view !== null && (
            <div className="teacher-pane">
            {view === 'reports' && (
              <div>
                <h3>Report Submitted</h3>
                <div className="table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr><th>Student Name</th><th>Type of Abuse</th><th>Date Submitted</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {reportsLoading ? (
                        <tr><td colSpan={5} className="empty">Loading...</td></tr>
                      ) : reportsError ? (
                        <tr><td colSpan={5} className="empty" style={{color:'#b91c1c'}}>{reportsError}</td></tr>
                      ) : reports.length === 0 ? (
                        <tr><td colSpan={5} className="empty">No reports submitted yet.</td></tr>
                      ) : reports.map(r => {
                        const studentName = r.student ? `${r.student.first_name||''} ${r.student.last_name||''}`.trim() : ''
                        const dateStr = r.submitted_at ? String(r.submitted_at).toString().replace('T',' ').slice(0,19) : ''
                        return (
                          <tr key={r.id}><td>{studentName}</td><td>{r.type||''}</td><td>{dateStr}</td><td><button className="btn-primary" onClick={() => openReport(r)}>View</button></td></tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewingReport && (
              <div className="compose-modal" role="dialog">
                <div className="compose-card" style={{maxWidth:'800px'}}>
                  <div className="compose-header">
                    <strong>Report Details</strong>
                    <button className="btn-ghost" onClick={() => setViewingReport(null)}>Close</button>
                  </div>
                  {(() => {
                    const r = viewingReport.report
                    const qs = viewingReport.questions
                    const studentName = r.student ? `${r.student.first_name||''} ${r.student.last_name||''}`.trim() : ''
                    const dateStr = r.submitted_at ? String(r.submitted_at).toString().replace('T',' ').slice(0,19) : ''
                    return (
                      <div>
                        <div style={{marginBottom:'0.75rem'}}>
                          <div><strong>Student:</strong> {studentName || '—'}</div>
                          <div><strong>Type:</strong> {r.type || '—'}</div>
                          <div><strong>Submitted:</strong> {dateStr || '—'}</div>
                        </div>
                        {reportDetailLoading ? (
                          <div className="status-line">Loading questions…</div>
                        ) : reportDetailError ? (
                          <div className="status-line" style={{color:'#b91c1c'}}>{reportDetailError}</div>
                        ) : (
                          <div className="table-wrap">
                            <table className="reports-table">
                              <thead>
                                <tr><th>Question</th><th>Answer</th></tr>
                              </thead>
                              <tbody>
                                {Array.isArray(qs) && qs.length > 0 ? (
                                  qs.map((q, idx) => (
                                    <tr key={q.id || idx}><td className="cell-question">{q.q || ''}</td><td className="cell-msg">{r.answers && (q.id in r.answers) ? String(r.answers[q.id]) : '—'}</td></tr>
                                  ))
                                ) : (
                                  Object.entries(r.answers || {}).length === 0 ? (
                                    <tr><td colSpan={2} className="empty">No answers recorded.</td></tr>
                                  ) : (
                                    Object.entries(r.answers || {}).map(([k,v]) => (
                                      <tr key={k}><td className="cell-question">{k}</td><td className="cell-msg">{String(v)}</td></tr>
                                    ))
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {view === 'messages' && (
              <>
              {/* Mobile: show list or single message full-width. Desktop: three-column. */}
              {isMobile ? (
                <div className="messages-mobile card">
                  {!selectedMessageId ? (
                    <>
                        <div className="messages-mobile-wrapper">
                          <div className="messages-top">
                            <div className="messages-left">
                          <div className="messages-folder-dropdown" ref={messagesMenuRef}>
                            <button className="folder-btn-top" onClick={()=>setMessagesMenuOpen(s=>!s)}><IoMdMenu/></button>
                            {messagesMenuOpen && (
                              <div className="folder-list">
                                {['Inbox','Deleted','Sent','Drafts'].map(f=> (
                                  <div key={f} className="folder-item" onClick={()=>handleFolderSelect(f)}>{f}</div>
                                ))}
                              </div>
                            )}
                          </div>
                              <input className="msg-search" placeholder="Search messages" value={search} onChange={e=>setSearch(e.target.value)} />
                            </div>
                          </div>

                          <div className="messages-list-header">
                            <h3>{folder}</h3>
                            <div className="list-actions">
                              <button className="btn-ghost" onClick={() => { setMessages([]) }}>Clear</button>
                            </div>
                          </div>

                          <div className="messages-list">
                            {messages.filter(m=> ((m._folder||'Inbox') === folder) && m.subject.toLowerCase().includes(search.toLowerCase())).length === 0 && <div className="empty">No messages yet.</div>}
                            {messages.filter(m=> ((m._folder||'Inbox') === folder) && m.subject.toLowerCase().includes(search.toLowerCase())).map(m => (
                              <div key={m.id} className={`mail-item`} onClick={() => selectMessageMobile(m.id)}>
                                <div className="mail-left">
                                  <div className="mail-recipient">{m.recipient}</div>
                                  <div className="mail-subject">{m.subject}</div>
                                </div>
                                <div className="mail-right">
                                  <div className={`label-chip ${m._color||''}`} onClick={(e)=>{ e.stopPropagation(); toggleLabelColor(m.id) }} />
                                  <div className="msg-time">{m.time||''}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button className="btn-compose-floating" onClick={startCompose} title="New message">+</button>
                    </>
                  ) : (
                    <div className="message-view-mobile">
                      <div className="mobile-view-header"><button className="btn-ghost" onClick={() => setSelectedMessageId(null)}>Back</button><div className="mobile-view-actions"><button className="btn-link" onClick={()=>editMessage(selectedMessageId)}>Edit</button><button className="btn-link danger" onClick={()=>deleteMessage(selectedMessageId)}>Delete</button></div></div>
                      {(() => { const msg = messages.find(x=>x.id===selectedMessageId); if (!msg) return <div className="empty">Message not found</div>; return (<div><h4>{msg.subject}</h4><div className="view-meta">{msg.recipient} • {msg.time}</div><div className="view-body">{msg.body||<em>No content</em>}</div><div className="label-edit"><input placeholder="Label name" value={msg.label||''} onChange={(e)=>setLabelName(msg.id, e.target.value)} /></div></div>) })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="messages-gmail">
                  <div className="gmail-left">
                    <div className="gmail-actions card">
                      <button className="btn-primary" onClick={startCompose}>Compose</button>
                      <div className="gmail-folders">
                        <button className="folder">Inbox</button>
                        <button className="folder">Sent</button>
                        <button className="folder">Starred</button>
                        <button className="folder">Trash</button>
                      </div>
                    </div>
                  </div>

                  <div className="gmail-list card">
                    <div className="messages-list-header">
                      <h3>Inbox</h3>
                      <div className="list-actions">
                        <button className="btn-ghost" onClick={() => { setMessages([]) }}>Clear</button>
                      </div>
                    </div>
                    <div className="gmail-table">
                      <div className="gmail-row header">
                        <div className="col-label"></div>
                        <div className="col-recipient">Recipient</div>
                        <div className="col-subject">Subject</div>
                        <div className="col-date">Date</div>
                      </div>
                      {messages.length === 0 && <div className="empty">No messages yet.</div>}
                      {messages.map(m => (
                        <div key={m.id} className={`gmail-row ${selectedMessageId===m.id? 'selected':''}`} onClick={() => selectMessage(m.id)}>
                          <div className="col-label">
                            <button className={`label-chip ${m._color||''}`} onClick={(e)=>{ e.stopPropagation(); toggleLabelColor(m.id) }} title="Change color"></button>
                          </div>
                          <div className="col-recipient">{m.recipient}</div>
                          <div className="col-subject">{m.subject}{m.label && <span className="label-name">{m.label}</span>}</div>
                          <div className="col-date">{m.time || ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="gmail-view card">
                    {selectedMessageId ? (
                      (() => {
                        const msg = messages.find(x=>x.id===selectedMessageId)
                        if (!msg) return <div className="empty">Message not found</div>
                        return (
                          <div>
                            <div className="view-header"><strong>{msg.subject}</strong><div className="view-meta">{msg.recipient} • {msg.time}</div></div>
                            <div className="view-body">{msg.body || <em>No content</em>}</div>
                            <div className="view-actions">
                              <button className="btn-link" onClick={()=>editMessage(msg.id)}>Edit</button>
                              <button className="btn-link danger" onClick={()=>deleteMessage(msg.id)}>Delete</button>
                              <div className="label-edit"><input placeholder="Label name" value={msg.label||''} onChange={(e)=>setLabelName(msg.id, e.target.value)} /></div>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="empty">Select a message to view</div>
                    )}
                  </div>
                </div>
              )}
              </>
            )}

            {/* Compose modal (used for mobile & desktop) */}
            {showCompose && (
              <div className="compose-modal" role="dialog">
                <div className="compose-card">
                  <div className="compose-header">
                    <strong>{editingId ? 'Edit Message' : 'New Message'}</strong>
                    <button className="btn-ghost" onClick={() => setShowCompose(false)}>Close</button>
                  </div>
                  <label>To</label>
                  <input value={compose.recipient} onChange={e => setCompose(c=>({...c, recipient: e.target.value}))} />
                  <label>Subject</label>
                  <input value={compose.subject} onChange={e => setCompose(c=>({...c, subject: e.target.value}))} />
                  <label>Message</label>
                  <textarea value={compose.body} onChange={e => setCompose(c=>({...c, body: e.target.value}))} />
                  <div className="compose-actions">
                    <button className="btn-primary" onClick={saveMessage}>Send</button>
                    <button className="btn-ghost" onClick={() => { setShowCompose(false); setCompose({ id: null, recipient:'', subject:'', body:'', label:'' }); setEditingId(null); }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {view === 'add' && (
              <div>
                <h3>Add Questionnaire</h3>
                <div className="card">
                  <label>Type</label>
                  <select value={newType} onChange={e=>setNewType(e.target.value)}>
                    {availableTypes.length === 0 ? <option value="">Select type</option> : availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {typesError && <div className="status-line" style={{color:'#b91c1c'}}>{typesError}</div>}
                  <div className="questions-list">
                    {newQuestions.map(q => (
                      <div className="q-row" key={q.id}>
                        <input placeholder="Question text" value={q.q} onChange={e=>updateQuestionLine(q.id,{q:e.target.value})} />
                        <select value={q.type} onChange={e=>updateQuestionLine(q.id,{type:e.target.value})}>
                          <option value="text">Text</option>
                          <option value="choice">Choice</option>
                        </select>
                        <label className="small"><input type="checkbox" checked={q.required} onChange={e=>updateQuestionLine(q.id,{required:e.target.checked})} /> required</label>
                        {q.type === 'choice' && <input placeholder="options,comma,separated" value={q.options} onChange={e=>updateQuestionLine(q.id,{options:e.target.value})} />}
                        <button className="btn-link danger" onClick={()=>removeQuestionLine(q.id)}>Remove</button>
                      </div>
                    ))}
                    <div className="q-actions"><button className="btn-primary" onClick={addQuestionLine}>Add Question</button></div>
                    <div className="q-actions"><button className="btn-primary" onClick={saveQuestionSet}>Save Questionnaire</button></div>
                  </div>
                </div>

                <div className="card">
                  {/* Custom Question Sets card removed as requested */}
                </div>

                <div className="card">
                  <h4>All Question Sets</h4>
                  <div className="table-wrap">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Abuse Type</th>
                          <th>Question</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remoteSets.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="empty">No question sets added yet.</td>
                          </tr>
                        ) : (
                          remoteSets.flatMap(set => (
                            (Array.isArray(set.schema) ? set.schema : []).map((qItem, idx) => (
                              <tr key={`${set.key}_${qItem.id || idx}`}>
                                <td>{set.key}</td>
                                <td className="cell-question">{qItem.q || ''}</td>
                                <td>
                                  <button className="btn-link" onClick={() => {
                                    setEditQS({ open:true, setId:set.id, setKey:set.key, index: idx, qItem: { ...qItem } })
                                  }}>Edit</button>
                                </td>
                              </tr>
                            ))
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {editQS.open && editQS.qItem && (
                  <div className="compose-modal" role="dialog">
                    <div className="compose-card">
                      <div className="compose-header">
                        <strong>Edit Question</strong>
                        <button className="btn-ghost" onClick={() => setEditQS({ open:false, setId:null, setKey:'', index:-1, qItem:null })}>Close</button>
                      </div>
                      <label>Abuse Type</label>
                      <input value={editQS.setKey} disabled />
                      <label>Question text</label>
                      <input value={editQS.qItem.q || ''} onChange={e=>setEditQS(s=>({ ...s, qItem: { ...s.qItem, q: e.target.value } }))} />
                      <div className="compose-actions">
                        <button className="btn-primary" onClick={async () => {
                          try {
                            const base = getApiBase()
                            const token = localStorage.getItem('authToken') || localStorage.getItem('token')
                            const set = remoteSets.find(x=>x.id === editQS.setId)
                            if (!set) { alert('Set not found'); return }
                            const schema = Array.isArray(set.schema) ? [...set.schema] : []
                            schema[editQS.index] = { ...schema[editQS.index], ...editQS.qItem }
                            const res = await fetch(`${base}/api/question-sets/${editQS.setId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
                              body: JSON.stringify({ key: set.key, title: set.title || null, schema })
                            })
                            if (!res.ok) {
                              const msg = await res.json().catch(()=>({}))
                              throw new Error(msg.message || 'Failed to update question set')
                            }
                            const updated = await res.json()
                            setRemoteSets(prev => prev.map(s => s.id === updated.id ? updated : s))
                            setEditQS({ open:false, setId:null, setKey:'', index:-1, qItem:null })
                          } catch (e) {
                            alert(e.message || 'Error')
                          }
                        }}>Save</button>
                        <button className="btn-ghost" onClick={() => setEditQS({ open:false, setId:null, setKey:'', index:-1, qItem:null })}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'students' && (
              <div>
                <h3>Student Management</h3>
                <div className="card">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem'}}>
                    <h4 style={{margin:0}}>Registered Students</h4>
                    <div style={{display:'flex', gap:'0.5rem'}}>
                      <input className="msg-search" placeholder="Search name or email" value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} />
                      <button className="btn-ghost" onClick={fetchStudents}>Refresh</button>
                    </div>
                  </div>
                  {studentsError && <div className="status-line" style={{color:'#b91c1c'}}>{studentsError}</div>}
                  <div className="table-wrap">
                    <table className="reports-table">
                      <thead>
                        <tr><th>Name</th><th>Age</th><th>Birthday</th><th>Contact</th><th>Address</th><th>Email</th><th>Created</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {studentsLoading ? (
                          <tr><td colSpan={3} className="empty">Loading...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr><td colSpan={3} className="empty">No students found.</td></tr>
                        ) : (
                          filteredStudents.map(s => (
                            <tr key={s.id}>
                              <td>{s.first_name} {s.middle_name ? s.middle_name+' ' : ''}{s.last_name}</td>
                              <td>{s.age ?? ''}</td>
                              <td>{s.birthday ? String(s.birthday).slice(0,10) : ''}</td>
                              <td>{s.contact_number ?? ''}</td>
                              <td>{s.address ?? ''}</td>
                              <td>{s.email}</td>
                              <td>{(s.created_at||'').toString().replace('T',' ').slice(0,19)}</td>
                              <td>
                                <button className="btn-link" onClick={() => { setEditStudent({
                                  id: s.id,
                                  first_name: s.first_name || '',
                                  middle_name: s.middle_name || '',
                                  last_name: s.last_name || '',
                                  age: s.age ?? '',
                                  birthday: s.birthday ? String(s.birthday).slice(0,10) : '',
                                  contact_number: s.contact_number || '',
                                  address: s.address || '',
                                  email: s.email || '',
                                }); setShowEdit(true); }}>Edit</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <h4>Register New Student</h4>
                  <div className="student-form-grid">
                    <div>
                      <label>First name</label>
                      <input value={studentForm.first_name} onChange={e=>setStudentForm(f=>({...f, first_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Middle name</label>
                      <input value={studentForm.middle_name} onChange={e=>setStudentForm(f=>({...f, middle_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Last name</label>
                      <input value={studentForm.last_name} onChange={e=>setStudentForm(f=>({...f, last_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Email</label>
                      <input type="email" value={studentForm.email} onChange={e=>setStudentForm(f=>({...f, email:e.target.value}))} />
                    </div>
                    <div>
                      <label>Age</label>
                      <input type="number" value={studentForm.age} onChange={e=>setStudentForm(f=>({...f, age:e.target.value}))} />
                    </div>
                    <div>
                      <label>Birthday</label>
                      <input type="date" value={studentForm.birthday} onChange={e=>setStudentForm(f=>({...f, birthday:e.target.value}))} />
                    </div>
                    <div>
                      <label>Contact number</label>
                      <input value={studentForm.contact_number} onChange={e=>setStudentForm(f=>({...f, contact_number:e.target.value}))} />
                    </div>
                    <div>
                      <label>Address</label>
                      <input value={studentForm.address} onChange={e=>setStudentForm(f=>({...f, address:e.target.value}))} />
                    </div>
                    <div>
                      <label>Password</label>
                      <input type="password" value={studentForm.password} onChange={e=>setStudentForm(f=>({...f, password:e.target.value}))} />
                    </div>
                    <div>
                      <label>Confirm Password</label>
                      <input type="password" value={studentForm.confirm} onChange={e=>setStudentForm(f=>({...f, confirm:e.target.value}))} />
                    </div>
                  </div>
                  {studentStatus && <div className="status-line">{studentStatus}</div>}
                  <div className="profile-actions">
                    <button className="btn-primary" onClick={async () => {
                      try {
                        setStudentStatus('')
                        const { first_name, middle_name, last_name, email, password, confirm, age, birthday, contact_number, address } = studentForm
                        if (!first_name || !last_name || !email || !password) { setStudentStatus('Please fill all required fields'); return }
                        if (password !== confirm) { setStudentStatus('Passwords do not match'); return }
                        const token = localStorage.getItem('authToken')
                        if (!token) { setStudentStatus('Not authenticated'); return }
                        const res = await fetch('http://127.0.0.1:8000/api/students', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ first_name, middle_name, last_name, email, password, age: age? Number(age): undefined, birthday, contact_number, address })
                        })
                        if (!res.ok) {
                          const msg = await res.json().catch(()=>({}))
                          throw new Error(msg.message || 'Failed to register student')
                        }
                        const created = await res.json()
                        setStudentStatus(`Student registered: ${created.first_name} ${created.last_name}`)
                        setStudentForm({ first_name:'', middle_name:'', last_name:'', age:'', birthday:'', contact_number:'', address:'', email:'', password:'', confirm:'' })
                      } catch (e) {
                        setStudentStatus(e.message || 'Error')
                      }
                    }}>Register</button>
                    <button className="btn-ghost" onClick={()=>{ setStudentForm({ first_name:'', middle_name:'', last_name:'', age:'', birthday:'', contact_number:'', address:'', email:'', password:'', confirm:'' }); setStudentStatus('') }}>Clear</button>
                  </div>
                </div>
              </div>
            )}

            {showEdit && editStudent && (
              <div className="compose-modal" role="dialog">
                <div className="compose-card">
                  <div className="compose-header">
                    <strong>Edit Student</strong>
                    <button className="btn-ghost" onClick={() => setShowEdit(false)}>Close</button>
                  </div>
                  <div className="student-form-grid">
                    <div>
                      <label>First name</label>
                      <input value={editStudent.first_name} onChange={e=>setEditStudent(s=>({...s, first_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Middle name</label>
                      <input value={editStudent.middle_name} onChange={e=>setEditStudent(s=>({...s, middle_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Last name</label>
                      <input value={editStudent.last_name} onChange={e=>setEditStudent(s=>({...s, last_name:e.target.value}))} />
                    </div>
                    <div>
                      <label>Email</label>
                      <input type="email" value={editStudent.email} onChange={e=>setEditStudent(s=>({...s, email:e.target.value}))} />
                    </div>
                    <div>
                      <label>Age</label>
                      <input type="number" value={editStudent.age} onChange={e=>setEditStudent(s=>({...s, age:e.target.value}))} />
                    </div>
                    <div>
                      <label>Birthday</label>
                      <input type="date" value={editStudent.birthday} onChange={e=>setEditStudent(s=>({...s, birthday:e.target.value}))} />
                    </div>
                    <div>
                      <label>Contact number</label>
                      <input value={editStudent.contact_number} onChange={e=>setEditStudent(s=>({...s, contact_number:e.target.value}))} />
                    </div>
                    <div>
                      <label>Address</label>
                      <input value={editStudent.address} onChange={e=>setEditStudent(s=>({...s, address:e.target.value}))} />
                    </div>
                  </div>
                  <div className="compose-actions">
                    <button className="btn-primary" onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');
                        if (!token) { alert('Not authenticated'); return }
                        const payload = { ...editStudent, age: editStudent.age? Number(editStudent.age): undefined }
                        const res = await fetch(`http://127.0.0.1:8000/api/students/${editStudent.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify(payload)
                        })
                        if (!res.ok) {
                          const msg = await res.json().catch(()=>({}))
                          throw new Error(msg.message || 'Failed to update student')
                        }
                        await res.json()
                        setShowEdit(false)
                        fetchStudents()
                      } catch (e) {
                        alert(e.message || 'Error')
                      }
                    }}>Save</button>
                    <button className="btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {view === 'settings' && (
              <div>
                <h3>Settings</h3>

                {/* Profile View Card */}
                {!editingProfile ? (
                  <div className="card profile-card">
                    <div className="profile-view">
                      <div className="profile-pic-section">
                        {profile.img ? (
                          <img src={profile.img} alt="profile" className="profile-picture" />
                        ) : (
                          <div className="profile-picture-placeholder">No Photo</div>
                        )}
                      </div>
                      <div className="profile-info">
                        <div className="profile-field">
                          <label>Name</label>
                          <p>{profile.name || 'Not set'}</p>
                        </div>
                        <div className="profile-field">
                          <label>Email</label>
                          <p>{profile.email || 'Not set'}</p>
                        </div>
                        <div className="profile-field">
                          <label>Teacher ID</label>
                          <p>{profile.teacherId || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => setEditingProfile(true)}>Edit Profile</button>
                  </div>
                ) : (
                  <div className="card">
                    <h4>Edit Profile</h4>
                    <div className="edit-profile-section">
                      <div className="profile-image-upload">
                        <input
                          type="file"
                          ref={profileImageRef}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setProfile(p => ({ ...p, img: event.target?.result || '' }))
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <div className="image-upload-area" onClick={() => profileImageRef.current?.click()}>
                          {profile.img ? (
                            <img src={profile.img} alt="profile preview" className="image-preview" />
                          ) : (
                            <div className="upload-placeholder">Click to upload photo</div>
                          )}
                        </div>
                      </div>

                      <label>Name</label>
                      <input value={profile.name} onChange={e=>setProfile(p=>({...p, name: e.target.value}))} />
                      <label>Email</label>
                      <input value={profile.email} onChange={e=>setProfile(p=>({...p, email: e.target.value}))} />
                      <label>Teacher ID</label>
                      <input value={profile.teacherId} onChange={e=>setProfile(p=>({...p, teacherId: e.target.value}))} />

                      <h4 style={{marginTop: '1.5rem'}}>Change Password</h4>
                      <label>Current password</label>
                      <input type="password" value={passwords.current} onChange={e=>setPasswords(s=>({...s, current: e.target.value}))} />
                      <label>New password</label>
                      <input type="password" value={passwords.new} onChange={e=>setPasswords(s=>({...s, new: e.target.value}))} />
                      <label>Confirm new</label>
                      <input type="password" value={passwords.confirm} onChange={e=>setPasswords(s=>({...s, confirm: e.target.value}))} />

                      <div className="profile-actions">
                        <button className="btn-primary" onClick={()=>{ setEditingProfile(false); alert('Profile saved (mock)') }}>Save</button>
                        <button className="btn-ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
