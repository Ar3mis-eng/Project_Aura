import React, { useState, useEffect, useRef } from 'react'
import './TeacherForms.css'
import { IoMdMenu } from 'react-icons/io'
import logo from '../Login/media/logo.png'

export default function TeacherForms({ onLogout = () => {} }) {
  const [view, setView] = useState(null) // null = welcome, or 'reports', 'messages', 'add', 'settings'
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Messages CRUD
  const [messages, setMessages] = useState(() => {
    try { const raw = localStorage.getItem('teacher_messages'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const [compose, setCompose] = useState({ id: null, recipient: '', subject: '', body: '', label: '' })
  const [editingId, setEditingId] = useState(null)

  // Reports (blank table initially, stored locally)
  const [reports, setReports] = useState(() => {
    try { const raw = localStorage.getItem('teacher_reports'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })

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
                      <tr><th>Student Name</th><th>Type of Abuse</th><th>Date Submitted</th><th>Message</th><th>Delete</th></tr>
                    </thead>
                    <tbody>
                      {reports.length === 0 ? (
                        <tr><td colSpan={5} className="empty">No reports submitted yet.</td></tr>
                      ) : reports.map(r => (
                        <tr key={r.id}><td>{r.student||''}</td><td>{r.type||''}</td><td>{r.date||''}</td><td className="cell-msg">{r.message||''}</td><td><button className="btn-danger" onClick={() => deleteReport(r.id)}>Delete</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'messages' && (
              // Mobile: show list or single message full-width. Desktop: three-column.
              isMobile ? (
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
              )
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
                  <label>Type name</label>
                  <input value={newType} onChange={e=>setNewType(e.target.value)} placeholder="e.g. Cyberbullying" />
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
                  <h4>Custom Question Sets</h4>
                  {Object.keys(customSets).length === 0 && <div className="empty">No custom sets</div>}
                  {Object.entries(customSets).map(([k,v]) => (
                    <div key={k} className="custom-set">
                      <div className="set-name">{k}</div>
                      <div className="set-actions"><button className="btn-link danger" onClick={()=>removeCustomSet(k)}>Remove</button></div>
                    </div>
                  ))}
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
