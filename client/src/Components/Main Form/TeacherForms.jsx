import React, { useState, useEffect, useRef } from 'react'
import './TeacherForms.css'
import { IoMdMenu } from 'react-icons/io'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import logo from '../Login/media/logo.png'
import * as XLSX from 'xlsx'

export default function TeacherForms({ onLogout = () => {} }) {
  const getApiBase = () => {
    const stored = localStorage.getItem('apiBase')
    return stored && stored.trim() ? stored.trim() : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000')
  }
  const [view, setView] = useState(null) // null = welcome, or 'reports', 'messages', 'add', 'settings', 'students'
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Messages CRUD - now using threads from backend
  const [threads, setThreads] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [threadsError, setThreadsError] = useState('')
  const [compose, setCompose] = useState({ id: null, recipientId: null, recipient: '', subject: '', body: '' })
  const [selectedThread, setSelectedThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [messagesMenuOpen, setMessagesMenuOpen] = useState(false)
  const messagesMenuRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const messagesContainerMobileRef = useRef(null)
  const [folder, setFolder] = useState('Inbox')
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [newReportCount, setNewReportCount] = useState(0)

  // Reports list from backend (fallback to local cache)
  const [reports, setReports] = useState(() => {
    try { const raw = localStorage.getItem('teacher_reports'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Settings / profile
  const [profile, setProfile] = useState(() => {
    try { const raw = localStorage.getItem('teacher_profile'); return raw ? JSON.parse(raw) : { first_name:'', middle_name:'', last_name:'', email:'', contact_number:'', address:'', img:'' } } catch { return { first_name:'', middle_name:'', last_name:'', email:'', contact_number:'', address:'', img:'' } }
  })
  const [passwords, setPasswords] = useState({ current:'', new:'', confirm:'' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // Analytics
  const [analytics, setAnalytics] = useState({ total_students: 0, total_teachers: 0, total_reports: 0, total_logins: 0 })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [abuseTypeCounts, setAbuseTypeCounts] = useState([])

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
        // Sort keys to move OTHERS to the end
        const sortedKeys = keys.sort((a, b) => {
          if (a.toLowerCase() === 'other' || a.toLowerCase() === 'others') return 1
          if (b.toLowerCase() === 'other' || b.toLowerCase() === 'others') return -1
          return a.localeCompare(b)
        })
        if (!cancelled) {
          setRemoteSets(Array.isArray(data) ? data : [])
          setAvailableTypes(sortedKeys)
          if (!newType && sortedKeys.length) setNewType(sortedKeys[0])
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
  const [showStudentPassword, setShowStudentPassword] = useState(false)
  const [showStudentConfirm, setShowStudentConfirm] = useState(false)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const filteredStudents = students.filter(s => {
    const q = studentQuery.toLowerCase();
    const name = `${s.first_name||''} ${s.middle_name||''} ${s.last_name||''}`.toLowerCase();
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
      const res = await fetch(`${getApiBase()}/api/students`, {
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

  const deleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return
    try {
      const token = localStorage.getItem('authToken')
      if (!token) { alert('Not authenticated'); return }
      const res = await fetch(`${getApiBase()}/api/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Accept':'application/json', 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        const msg = await res.json().catch(()=>({}))
        throw new Error(msg.message || 'Failed to delete student')
      }
      await fetchStudents() // Refresh the list
      alert('Student deleted successfully')
    } catch (e) {
      alert(e.message || 'Error deleting student')
    }
  }

  useEffect(() => { if (view === 'students') fetchStudents() }, [view])
  useEffect(() => { if (showCompose && students.length === 0) fetchStudents() }, [showCompose])
  useEffect(() => { if (view === 'analytics') fetchAnalytics() }, [view])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { localStorage.setItem('teacher_reports', JSON.stringify(reports)) }, [reports])
  useEffect(() => { localStorage.setItem('teacher_profile', JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('customQuestionSets', JSON.stringify(customSets)) }, [customSets])

  // Fetch unread message count periodically
  useEffect(() => {
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
        const threadsData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        const totalUnread = threadsData.reduce((sum, thread) => sum + (thread.unread_count || 0), 0)
        setUnreadCount(totalUnread)
      } catch (e) {
        console.error('Error fetching unread count:', e)
      }
    }
    
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch new report count periodically
  useEffect(() => {
    const fetchNewReportCount = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        if (!token) return
        const base = getApiBase()
        const res = await fetch(`${base}/api/reports`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        
        // Get last viewed timestamp from localStorage
        const lastViewed = localStorage.getItem('reports_last_viewed')
        const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0
        
        // Count only reports submitted after last view
        const newCount = list.filter(r => {
          if (r.status !== 'submitted') return false
          const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : 0
          return submittedAt > lastViewedTime
        }).length
        
        setNewReportCount(newCount)
      } catch (e) {
        console.error('Error fetching new report count:', e)
      }
    }
    
    fetchNewReportCount()
    const interval = setInterval(fetchNewReportCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset unread count when viewing messages or reports
  useEffect(() => {
    if (view === 'messages') {
      setUnreadCount(0)
    }
    if (view === 'reports') {
      // Mark reports as viewed
      localStorage.setItem('reports_last_viewed', new Date().toISOString())
      setNewReportCount(0)
    }
  }, [view])

  // Messages handlers - thread-based
  const fetchThreads = async (silent = false) => {
    try {
      if (!silent) setThreadsLoading(true)
      setThreadsError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) { 
        if (!silent) setThreadsLoading(false)
        setThreadsError('Not authenticated')
        return 
      }
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads`, { headers: { Accept:'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load threads')
      const data = await res.json()
      setThreads(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (e) {
      if (!silent) setThreadsError(e.message || 'Error loading threads')
    } finally {
      if (!silent) setThreadsLoading(false)
    }
  }

  const fetchThreadMessages = async (threadId, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads/${threadId}/messages`, { headers: { Accept:'application/json', Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      const fetchedMessages = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Preserve optimistic messages (temporary ones being sent)
      setThreadMessages(prev => {
        const optimisticMessages = prev.filter(m => m.id && m.id.toString().startsWith('temp-'))
        // Merge: keep optimistic messages, add fetched messages that aren't duplicates
        const fetchedIds = new Set(fetchedMessages.map(m => m.id))
        const merged = [...fetchedMessages, ...optimisticMessages.filter(om => !fetchedIds.has(om.id))]
        return merged
      })
    } catch (e) {
      if (!silent) alert('Error loading messages: ' + e.message)
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }

  const refreshUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      const threadsData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const totalUnread = threadsData.reduce((sum, t) => sum + (t.unread_count || 0), 0)
      setUnreadCount(totalUnread)
    } catch (e) {
      console.error('Error refreshing unread count:', e)
    }
  }

  const handleBackFromThread = () => {
    setSelectedThread(null)
    fetchThreads(true)
    refreshUnreadCount()
  }

  const startCompose = () => { 
    setCompose({ id: null, recipientId: null, recipient:'', subject:'', body:'' })
    setSelectedThread(null)
    setView('messages')
    setShowCompose(true)
  }
  
  const saveMessage = async () => {
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
      if (!threadRes.ok) throw new Error('Failed to create thread')
      const thread = await threadRes.json()
      // Send first message
      const msgRes = await fetch(`${base}/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept:'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: compose.body })
      })
      if (!msgRes.ok) throw new Error('Failed to send message')
      setCompose({ id: null, recipientId: null, recipient:'', subject:'', body:'' })
      setShowCompose(false)
      fetchThreads()
      refreshUnreadCount()
    } catch (e) {
      alert(e.message || 'Error sending message')
    }
  }

  const selectThread = async (thread) => {
    setSelectedThread(thread)
    setView('messages')
    await fetchThreadMessages(thread.id, true)
    // Refresh unread count after opening thread
    setTimeout(() => refreshUnreadCount(), 500)
  }

  const selectThreadMobile = async (thread) => {
    setSelectedThread(thread)
    setView('messages')
    setShowMenu(false)
    await fetchThreadMessages(thread.id, true)
    // Refresh unread count after opening thread
    setTimeout(() => refreshUnreadCount(), 500)
  }

  const sendReply = async (body) => {
    if (!selectedThread || !body.trim()) return
    
    const messageText = body.trim()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
    
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
    
    setThreadMessages(prev => [...prev, optimisticMessage])
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept:'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: messageText })
      })
      if (!res.ok) throw new Error('Failed to send message')
      
      const data = await res.json()
      const newMessage = data?.data || data
      
      // Replace optimistic message with real one from server
      setThreadMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? newMessage : m
      ))
      // Refresh threads list to update conversation preview
      fetchThreads(true)
      refreshUnreadCount()
    } catch (e) {
      // Remove optimistic message on error
      setThreadMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      alert('Error sending reply: ' + e.message)
    }
  }

  // Reports handlers
  const deleteReport = async (id, studentName) => {
    if (!confirm(`Are you sure you want to delete this report from ${studentName}?`)) return
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/reports/${id}`, {
        method: 'DELETE',
        headers: { Accept:'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete report')
      setReports(prev => prev.filter(r => r.id !== id))
      alert('Report deleted successfully')
    } catch (e) {
      alert('Error deleting report: ' + e.message)
    }
  }

  // Analytics handlers
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setAnalyticsLoading(false)
        setAnalyticsError('Not authenticated')
        return
      }
      const base = getApiBase()
      const res = await fetch(`${base}/api/analytics`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load analytics')
      const data = await res.json()
      setAnalytics(data.data || { total_students: 0, total_teachers: 0, total_reports: 0, total_logins: 0 })
      
      // Fetch question sets to get all abuse types
      const qsRes = await fetch(`${base}/api/question-sets`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      const questionSets = qsRes.ok ? await qsRes.json() : []
      const allTypes = Array.isArray(questionSets) ? questionSets.map(qs => qs.key).filter(Boolean) : []
      
      // Count reports by type (already filtered to teacher's students by backend)
      const typeCounts = {}
      allTypes.forEach(type => {
        typeCounts[type] = 0
      })
      
      reports.forEach(report => {
        const type = report.type || 'Unspecified'
        if (type in typeCounts) {
          typeCounts[type]++
        } else {
          typeCounts[type] = 1
        }
      })
      
      // Convert to array and sort (move "Other" to the end)
      const countsArray = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count
      })).sort((a, b) => {
        // Move "Other" or "Others" to the end
        const aIsOther = a.type.toLowerCase() === 'other' || a.type.toLowerCase() === 'others'
        const bIsOther = b.type.toLowerCase() === 'other' || b.type.toLowerCase() === 'others'
        if (aIsOther && !bIsOther) return 1
        if (!aIsOther && bIsOther) return -1
        // Otherwise sort by count (highest first)
        return b.count - a.count
      })
      
      setAbuseTypeCounts(countsArray)
    } catch (e) {
      setAnalyticsError(e.message || 'Error loading analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const messageStudent = (report) => {
    if (!report.student) {
      alert('Student information not available')
      return
    }
    const dateStr = report.submitted_at ? String(report.submitted_at).toString().slice(0,10) : ''
    setCompose({
      id: null,
      recipientId: parseInt(report.student.id),
      recipient: `${report.student.first_name||''} ${report.student.last_name||''}`.trim(),
      subject: `Re: ${report.type || 'Report'} - Report Submitted on ${dateStr}`,
      body: ''
    })
    setShowCompose(true)
    setView('messages')
  }

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
  useEffect(() => { 
    if (view === 'messages') {
      fetchThreads()
      refreshUnreadCount()
      // Poll for new messages every 10 seconds
      const interval = setInterval(() => {
        fetchThreads(true) // silent mode
        refreshUnreadCount()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [view])
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
    if (messagesContainerMobileRef.current) {
      messagesContainerMobileRef.current.scrollTop = messagesContainerMobileRef.current.scrollHeight
    }
  }, [threadMessages])

  // Poll for new messages in selected thread
  useEffect(() => {
    if (selectedThread && view === 'messages') {
      const interval = setInterval(() => {
        fetchThreadMessages(selectedThread.id, true) // silent mode
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedThread, view])

  // Also add global polling for unread count
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnreadCount()
    }, 15000) // Every 15 seconds
    return () => clearInterval(interval)
  }, [])

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      if (reports.length === 0) {
        alert('No reports to export')
        return
      }
      
      // Get teacher's full name
      const teacherName = `${profile.first_name || ''} ${profile.middle_name || ''} ${profile.last_name || ''}`.trim() || 'Teacher'
      
      // Get current date
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      
      // Fetch question sets from backend
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      const base = getApiBase()
      const res = await fetch(`${base}/api/question-sets`, {
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : undefined }
      })
      if (!res.ok) throw new Error('Failed to load question sets')
      const questionSets = await res.json()
      
      // Group reports by abuse type
      const reportsByType = {}
      reports.forEach(report => {
        const type = report.type || 'Unspecified'
        if (!reportsByType[type]) {
          reportsByType[type] = []
        }
        reportsByType[type].push(report)
      })
      
      // Create workbook
      const workbook = XLSX.utils.book_new()
      
      // Create a sheet for each abuse type
      Object.keys(reportsByType).forEach(abuseType => {
        const typeReports = reportsByType[abuseType]
        
        // Find the question set for this abuse type
        const questionSet = Array.isArray(questionSets) ? questionSets.find(s => s && s.key === abuseType) : null
        const questions = Array.isArray(questionSet?.schema) ? questionSet.schema : []
        
        // Build header row: Student Name + Question columns
        const headers = ['Student Name']
        questions.forEach(q => {
          headers.push(q.q || 'Question')
        })
        
        // Build data rows
        const data = [headers]
        typeReports.forEach(report => {
          const studentName = report.student ? `${report.student.first_name || ''} ${report.student.last_name || ''}`.trim() : 'Unknown'
          const row = [studentName]
          
          // Add answers for each question
          questions.forEach(q => {
            const answer = report.answers && (q.id in report.answers) ? String(report.answers[q.id]) : '—'
            row.push(answer)
          })
          
          data.push(row)
        })
        
        // Create worksheet from data
        const worksheet = XLSX.utils.aoa_to_sheet(data)
        
        // Set column widths
        const colWidths = [{ wch: 20 }] // Student Name column
        questions.forEach(() => {
          colWidths.push({ wch: 30 }) // Question columns
        })
        worksheet['!cols'] = colWidths
        
        // Add sheet to workbook (sanitize sheet name - Excel has 31 char limit and doesn't allow certain chars)
        let sheetName = abuseType.substring(0, 31).replace(/[:\\\/?\*\[\]]/g, '_')
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      })
      
      // Generate filename and download
      const filename = `Reports Submitted to Teacher ${teacherName} - ${currentDate}.xlsx`
      XLSX.writeFile(workbook, filename)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export reports: ' + (error.message || 'Unknown error'))
    }
  }

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
      
      // Mark this report as viewed
      localStorage.setItem('reports_last_viewed', new Date().toISOString())
      // Recalculate the new report count
      const reportsRes = await fetch(`${base}/api/reports`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        const lastViewed = new Date().toISOString()
        const lastViewedTime = new Date(lastViewed).getTime()
        const newCount = list.filter(r => {
          if (r.status !== 'submitted') return false
          const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : 0
          return submittedAt > lastViewedTime
        }).length
        setNewReportCount(newCount)
      }
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
    setSelectedThread(null)
  }

  // Profile edit mode
  const [editingProfile, setEditingProfile] = useState(false)
  const profileImageRef = useRef(null)

  // Fetch user profile from API
  const fetchProfile = async () => {
    try {
      setProfileLoading(true)
      setProfileError('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setProfileError('Not authenticated')
        return
      }
      const base = getApiBase()
      const res = await fetch(`${base}/api/auth/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load profile')
      const userData = await res.json()
      
      const profileData = {
        first_name: userData.first_name || '',
        middle_name: userData.middle_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        contact_number: userData.contact_number || '',
        address: userData.address || '',
        img: userData.profile_photo ? `${base}/storage/${userData.profile_photo}` : ''
      }
      
      setProfile(profileData)
      localStorage.setItem('teacher_profile', JSON.stringify(profileData))
    } catch (e) {
      setProfileError(e.message || 'Error loading profile')
    } finally {
      setProfileLoading(false)
    }
  }

  // Save profile updates
  const saveProfile = async () => {
    try {
      setProfileLoading(true)
      setProfileError('')
      setProfileSuccess('')
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setProfileError('Not authenticated')
        return
      }
      
      if (!profile.email) {
        setProfileError('Email is required')
        return
      }
      
      const base = getApiBase()
      const res = await fetch(`${base}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          middle_name: profile.middle_name,
          last_name: profile.last_name,
          email: profile.email,
          contact_number: profile.contact_number,
          address: profile.address
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update profile')
      }
      
      const data = await res.json()
      setProfileSuccess('Profile updated successfully')
      
      // Update local storage
      const updatedProfile = {
        ...profile,
        first_name: data.user?.first_name || profile.first_name,
        middle_name: data.user?.middle_name || profile.middle_name,
        last_name: data.user?.last_name || profile.last_name,
        email: data.user?.email || profile.email,
        contact_number: data.user?.contact_number || profile.contact_number,
        address: data.user?.address || profile.address
      }
      setProfile(updatedProfile)
      localStorage.setItem('teacher_profile', JSON.stringify(updatedProfile))
      
      setTimeout(() => {
        setEditingProfile(false)
        setProfileSuccess('')
      }, 1500)
    } catch (e) {
      setProfileError(e.message || 'Error updating profile')
    } finally {
      setProfileLoading(false)
    }
  }

  // Change password
  const changePassword = async () => {
    try {
      setProfileLoading(true)
      setProfileError('')
      setProfileSuccess('')
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setProfileError('Not authenticated')
        return
      }
      
      if (!passwords.current || !passwords.new || !passwords.confirm) {
        setProfileError('All password fields are required')
        return
      }
      
      if (passwords.new !== passwords.confirm) {
        setProfileError('New passwords do not match')
        return
      }
      
      if (passwords.new.length < 6) {
        setProfileError('New password must be at least 6 characters')
        return
      }
      
      const base = getApiBase()
      const res = await fetch(`${base}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new,
          new_password_confirmation: passwords.confirm
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to change password')
      }
      
      setProfileSuccess('Password changed successfully')
      setPasswords({ current: '', new: '', confirm: '' })
      
      setTimeout(() => {
        setProfileSuccess('')
      }, 3000)
    } catch (e) {
      setProfileError(e.message || 'Error changing password')
    } finally {
      setProfileLoading(false)
    }
  }

  // Fetch profile when settings view is opened
  useEffect(() => {
    if (view === 'settings') {
      fetchProfile()
    }
  }, [view])

  // Upload profile photo
  const uploadProfilePhoto = async (file) => {
    try {
      setProfileLoading(true)
      setProfileError('')
      setProfileSuccess('')
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setProfileError('Not authenticated')
        return
      }
      
      const formData = new FormData()
      formData.append('photo', file)
      
      const base = getApiBase()
      const res = await fetch(`${base}/api/auth/profile/photo`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to upload photo')
      }
      
      const data = await res.json()
      setProfileSuccess('Profile photo uploaded successfully')
      
      // Update profile with new photo URL - use photo_path with base URL for consistency
      const photoUrl = data.photo_path ? `${base}/storage/${data.photo_path}` : ''
      setProfile(p => ({ ...p, img: photoUrl }))
      
      // Also refresh the full profile
      setTimeout(() => {
        fetchProfile()
        setProfileSuccess('')
      }, 1500)
    } catch (e) {
      setProfileError(e.message || 'Error uploading photo')
    } finally {
      setProfileLoading(false)
    }
  }

  // Delete profile photo
  const deleteProfilePhoto = async () => {
    if (!confirm('Are you sure you want to delete your profile photo?')) return
    
    try {
      setProfileLoading(true)
      setProfileError('')
      setProfileSuccess('')
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setProfileError('Not authenticated')
        return
      }
      
      const base = getApiBase()
      const res = await fetch(`${base}/api/auth/profile/photo`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to delete photo')
      }
      
      setProfileSuccess('Profile photo deleted successfully')
      setProfile(p => ({ ...p, img: '' }))
      
      setTimeout(() => {
        setProfileSuccess('')
      }, 1500)
    } catch (e) {
      setProfileError(e.message || 'Error deleting photo')
    } finally {
      setProfileLoading(false)
    }
  }

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
                  <button onClick={() => handleMenuSelect('reports')} style={{position:'relative'}}>
                    Report Submitted
                    {newReportCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        right: '12px',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444'
                      }} />
                    )}
                  </button>
                  <button onClick={() => handleMenuSelect('analytics')}>Analytics</button>
                  <button onClick={() => handleMenuSelect('messages')} style={{position:'relative'}}>
                    Messages
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        right: '12px',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#dc2626',
                        borderRadius: '50%'
                      }} />
                    )}
                  </button>
                  <button onClick={() => handleMenuSelect('students')}>Student Management</button>
                  <button onClick={() => handleMenuSelect('add')}>Add Questionnaire</button>
                  <button onClick={() => handleMenuSelect('settings')}>Settings</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Desktop sidebar menu - Fixed on left */}
        <aside className="teacher-sidebar">
          <nav>
            <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')} style={{position:'relative'}}>
              Report Submitted
              {newReportCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }} />
              )}
            </button>
            <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}>Analytics</button>
            <button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')} style={{position:'relative'}}>
              Messages
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%'
                }} />
              )}
            </button>
            <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>Student Management</button>
            <button className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}>Add Questionnaire</button>
            <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
            <button className="logout-btn" onClick={() => onLogout()}>Logout</button>
          </nav>
        </aside>

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

          {/* Main content panel */}
          {view !== null && (
            <div className="teacher-pane">
            {view === 'reports' && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                  <h3 style={{margin: 0}}>Report Submitted</h3>
                  <button 
                    className="btn-primary" 
                    onClick={exportToExcel}
                    disabled={reports.length === 0}
                    style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}
                  >
                    Export to Excel
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr><th>Student Name</th><th>Type of Abuse</th><th>Date Submitted</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {reportsLoading ? (
                        <tr><td colSpan={4} className="empty">Loading...</td></tr>
                      ) : reportsError ? (
                        <tr><td colSpan={4} className="empty" style={{color:'#b91c1c'}}>{reportsError}</td></tr>
                      ) : reports.length === 0 ? (
                        <tr><td colSpan={4} className="empty">No reports submitted yet.</td></tr>
                      ) : reports.map(r => {
                        const studentName = r.student ? `${r.student.first_name||''} ${r.student.last_name||''}`.trim() : ''
                        const dateStr = r.submitted_at ? String(r.submitted_at).toString().replace('T',' ').slice(0,19) : ''
                        return (
                          <tr key={r.id}>
                            <td>{studentName}</td>
                            <td>{r.type||''}</td>
                            <td>{dateStr}</td>
                            <td>
                              <button className="btn-primary" onClick={() => openReport(r)} style={{marginRight:'0.5rem'}}>View</button>
                              <button className="btn-primary" onClick={() => messageStudent(r)} style={{marginRight:'0.5rem'}}>Message</button>
                              <button className="btn-link danger" onClick={() => deleteReport(r.id, studentName)}>Delete</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'analytics' && (
              <div>
                <h3>Analytics Dashboard</h3>
                {analyticsLoading ? (
                  <div className="card"><div className="empty">Loading analytics...</div></div>
                ) : analyticsError ? (
                  <div className="card"><div className="empty" style={{color:'#b91c1c'}}>{analyticsError}</div></div>
                ) : (
                  <>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'1rem', marginTop:'1rem'}}>
                      <div className="card" style={{textAlign:'center', padding:'1.5rem'}}>
                        <div style={{fontSize:'2.5rem', fontWeight:'700', color:'#667eea', marginBottom:'0.5rem'}}>
                          {analytics.total_students}
                        </div>
                        <div style={{fontSize:'1rem', color:'#6b7280', fontWeight:'500'}}>Total Students</div>
                      </div>
                      <div className="card" style={{textAlign:'center', padding:'1.5rem'}}>
                        <div style={{fontSize:'2.5rem', fontWeight:'700', color:'#764ba2', marginBottom:'0.5rem'}}>
                          {analytics.total_teachers}
                        </div>
                        <div style={{fontSize:'1rem', color:'#6b7280', fontWeight:'500'}}>Total Teachers</div>
                      </div>
                      <div className="card" style={{textAlign:'center', padding:'1.5rem'}}>
                        <div style={{fontSize:'2.5rem', fontWeight:'700', color:'#059669', marginBottom:'0.5rem'}}>
                          {analytics.total_reports}
                        </div>
                        <div style={{fontSize:'1rem', color:'#6b7280', fontWeight:'500'}}>Reports Submitted</div>
                      </div>
                      <div className="card" style={{textAlign:'center', padding:'1.5rem'}}>
                        <div style={{fontSize:'2.5rem', fontWeight:'700', color:'#dc2626', marginBottom:'0.5rem'}}>
                          {analytics.total_logins}
                        </div>
                        <div style={{fontSize:'1rem', color:'#6b7280', fontWeight:'500'}}>Total App Usage</div>
                      </div>
                    </div>
                    
                    <div style={{marginTop:'2rem'}}>
                      <h4 style={{marginBottom:'1rem', fontSize:'1.25rem', fontWeight:'600'}}>Reports by Abuse Type</h4>
                      {abuseTypeCounts.length === 0 ? (
                        <div className="card"><div className="empty">No abuse types available</div></div>
                      ) : (
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem'}}>
                          {abuseTypeCounts.map((item, idx) => {
                            const colors = ['#667eea', '#764ba2', '#059669', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
                            const color = colors[idx % colors.length]
                            return (
                              <div key={item.type} className="card" style={{textAlign:'center', padding:'1.5rem'}}>
                                <div style={{fontSize:'2.5rem', fontWeight:'700', color: color, marginBottom:'0.5rem'}}>
                                  {item.count}
                                </div>
                                <div style={{fontSize:'1rem', color:'#6b7280', fontWeight:'500'}}>{item.type}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
              {/* Mobile: show list or single thread full-width. Desktop: three-column. */}
              {isMobile ? (
                <div className="messages-mobile card">
                  {!selectedThread ? (
                    <>
                        <div className="messages-mobile-wrapper">
                          <div className="messages-top">
                            <div className="messages-left">
                          <div className="messages-folder-dropdown" ref={messagesMenuRef}>
                            <button className="folder-btn-top" onClick={()=>setMessagesMenuOpen(s=>!s)}><IoMdMenu/></button>
                            {messagesMenuOpen && (
                              <div className="folder-list">
                                {['Inbox','Sent'].map(f=> (
                                  <div key={f} className="folder-item" onClick={()=>handleFolderSelect(f)}>{f}</div>
                                ))}
                              </div>
                            )}
                          </div>
                              <input className="msg-search" placeholder="Search conversations" value={search} onChange={e=>setSearch(e.target.value)} />
                            </div>
                          </div>

                          <div className="messages-list-header">
                            <h3>Conversations</h3>
                          </div>

                          <div className="messages-list">
                            {threadsLoading ? (
                              <div className="empty">Loading...</div>
                            ) : threadsError ? (
                              <div className="empty" style={{color:'#b91c1c'}}>{threadsError}</div>
                            ) : threads.filter(t => t.subject?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                              <div className="empty">No conversations yet.</div>
                            ) : (
                              threads.filter(t => t.subject?.toLowerCase().includes(search.toLowerCase())).map(t => {
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
                                  <div key={t.id} className={`thread-item ${hasUnread ? 'has-unread' : ''}`} onClick={() => selectThreadMobile(t)}>
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
                              })
                            )}
                          </div>
                        </div>
                        <button className="btn-compose-floating" onClick={startCompose} title="New message">+</button>
                    </>
                  ) : (
                    <div className="message-view-mobile">
                      <div className="mobile-view-header">
                        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                          <button className="btn-ghost" onClick={handleBackFromThread}>Back</button>
                          <div style={{fontWeight:'700', fontSize:'1rem'}}>
                            {(() => {
                              const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
                              const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
                              return Array.isArray(selectedThread.participants) 
                                ? selectedThread.participants
                                    .filter(p => p.id !== currentUserId)
                                    .map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ') 
                                : ''
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="thread-messages-container">
                        {messagesLoading ? (
                          <div className="empty">Loading...</div>
                        ) : threadMessages.length === 0 ? (
                          <div className="empty">No messages in this thread.</div>
                        ) : (
                          <div ref={messagesContainerRef} className="messages-list" style={{padding:'1rem', gap:'0.75rem', display:'flex', flexDirection:'column'}}>
                            {threadMessages.map(msg => {
                              const from = msg.from ? `${msg.from.first_name||''} ${msg.from.last_name||''}`.trim() : 'Unknown'
                              const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
                              const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
                              const isOutgoing = currentUserId && msg.from_user_id && parseInt(msg.from_user_id) === currentUserId
                              const isUnread = !isOutgoing && msg.is_read === false
                              return (
                                <div key={msg.id} className={`message-item ${isOutgoing ? 'outgoing' : 'incoming'} ${isUnread ? 'unread' : ''}`}>
                                  <div className="bubble" style={isUnread ? {backgroundColor: '#dbeafe', borderLeft: '3px solid #3b82f6'} : {}}>
                                    <div style={{fontWeight:'600', fontSize:'0.7rem', marginBottom:'0.25rem', color: isOutgoing ? '#e0e7ff' : '#4b5563'}}>{from}</div>
                                    <div>{msg.body}</div>
                                  </div>
                                  <div className="msg-time">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="reply-section">
                          <textarea placeholder="Type your reply..." value={replyText} onChange={e=>setReplyText(e.target.value)} rows={3} />
                          <button className="btn-primary" onClick={async () => {
                            await sendReply(replyText)
                            setReplyText('')
                          }}>Send</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="messages-container">
                  <div className="messages-header">
                    <div className="messages-title">Messages</div>
                    {!selectedThread && (
                      <div className="messages-actions">
                        <button className="btn-primary" onClick={startCompose}>Compose</button>
                      </div>
                    )}
                  </div>

                  {!selectedThread ? (
                    <div className="threads-list">
                      {threadsLoading && <div className="empty">Loading conversations...</div>}
                      {threadsError && <div className="empty" style={{color:'#b91c1c'}}>{threadsError}</div>}
                      {!threadsLoading && !threadsError && threads.length === 0 && (
                        <div className="empty">No conversations yet.</div>
                      )}
                      {!threadsLoading && threads.map(t => {
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
                          <div key={t.id} className={`thread-item ${hasUnread ? 'has-unread' : ''}`} onClick={() => selectThread(t)}>
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
                          <button className="btn-light" onClick={handleBackFromThread}>← Back</button>
                          <div style={{fontWeight:'600', fontSize:'1.1rem'}}>
                            {(() => {
                              const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
                              const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
                              return Array.isArray(selectedThread.participants) 
                                ? selectedThread.participants
                                    .filter(p => p.id !== currentUserId)
                                    .map(p => `${p.first_name||''} ${p.last_name||''}`).join(', ')
                                : ''
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="messages-list" ref={messagesContainerMobileRef}>
                        {messagesLoading && <div className="empty">Loading messages...</div>}
                        {!messagesLoading && threadMessages.map(msg => {
                          const from = msg.from ? `${msg.from.first_name||''} ${msg.from.last_name||''}`.trim() : 'Unknown'
                          const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
                          const currentUserId = currentUser.id ? parseInt(currentUser.id) : null
                          const isOutgoing = currentUserId && msg.from_user_id && parseInt(msg.from_user_id) === currentUserId
                          const isUnread = !isOutgoing && msg.is_read === false
                          return (
                            <div key={msg.id} className={`message-item ${isOutgoing ? 'outgoing' : 'incoming'} ${isUnread ? 'unread' : ''}`}>
                              <div className="bubble" style={isUnread ? {backgroundColor: '#dbeafe', borderLeft: '3px solid #3b82f6'} : {}}>
                                <div style={{fontWeight:'600', fontSize:'0.7rem', marginBottom:'0.25rem', color: isOutgoing ? '#e0e7ff' : '#4b5563'}}>{from}</div>
                                <div>{msg.body}</div>
                              </div>
                              <div className="msg-time">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="message-input-area">
                        <textarea ref={messagesContainerRef} className="message-textarea" placeholder="Type your reply..." value={replyText} onChange={e=>setReplyText(e.target.value)} />
                        <button className="send-btn" type="button" onClick={async () => {
                          await sendReply(replyText)
                          setReplyText('')
                        }}>Send</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              </>
            )}

            {/* Compose modal (used for mobile & desktop) */}
            {showCompose && (
              <div className="compose-modal" role="dialog">
                <div className="compose-card">
                  <div className="compose-header">
                    <strong>New Message</strong>
                    <button className="btn-ghost" onClick={() => setShowCompose(false)}>Close</button>
                  </div>
                  <label>To (Student)</label>
                  <select value={compose.recipientId||''} onChange={e => {
                    const id = parseInt(e.target.value)
                    const student = students.find(s => s.id === id)
                    setCompose(c=>({...c, recipientId: id, recipient: student ? `${student.first_name} ${student.last_name}` : ''}))
                  }}>
                    <option value="">Select a student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.email})</option>
                    ))}
                  </select>
                  <label>Subject</label>
                  <input value={compose.subject} onChange={e => setCompose(c=>({...c, subject: e.target.value}))} />
                  <label>Message</label>
                  <textarea value={compose.body} onChange={e => setCompose(c=>({...c, body: e.target.value}))} rows={6} />
                  <div className="compose-actions">
                    <button className="btn-primary" onClick={saveMessage}>Send</button>
                    <button className="btn-ghost" onClick={() => { setShowCompose(false); setCompose({ id: null, recipientId: null, recipient:'', subject:'', body:'' }); }}>Cancel</button>
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
                        {q.type === 'choice' && (
                          <div style={{display:'flex', flexDirection:'column', gap:'0.25rem'}}>
                            <label style={{fontSize:'0.75rem', fontWeight:'600', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px'}}>Multiple Choice Options</label>
                            <input placeholder="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)" value={q.options} onChange={e=>updateQuestionLine(q.id,{options:e.target.value})} />
                            <span style={{fontSize:'0.75rem', color:'#94a3b8', fontStyle:'italic'}}>Separate each option with a comma</span>
                          </div>
                        )}
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
                    <input className="msg-search" placeholder="Search name or email" value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} />
                  </div>
                  {studentsError && <div className="status-line" style={{color:'#b91c1c'}}>{studentsError}</div>}
                  <div className="table-wrap">
                    <table className="reports-table">
                      <thead>
                        <tr><th>Name</th><th>Age</th><th>Birthday</th><th>Contact</th><th>Address</th><th>Email</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {studentsLoading ? (
                          <tr><td colSpan={7} className="empty">Loading...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr><td colSpan={7} className="empty">No students found.</td></tr>
                        ) : (
                          filteredStudents.map(s => (
                            <tr key={s.id}>
                              <td>{s.first_name} {s.middle_name ? s.middle_name+' ' : ''}{s.last_name}</td>
                              <td>{s.age ?? ''}</td>
                              <td>{s.birthday ? String(s.birthday).slice(0,10) : ''}</td>
                              <td>{s.contact_number ?? ''}</td>
                              <td>{s.address ?? ''}</td>
                              <td>{s.email}</td>
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
                                {' '}
                                <button className="btn-link" style={{color:'#b91c1c'}} onClick={() => deleteStudent(s.id)}>Delete</button>
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
                      <div style={{ position: 'relative' }}>
                        <input type={showStudentPassword ? "text" : "password"} value={studentForm.password} onChange={e=>setStudentForm(f=>({...f, password:e.target.value}))} />
                        <button
                          type="button"
                          onClick={() => setShowStudentPassword(!showStudentPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#666'
                          }}
                          aria-label={showStudentPassword ? "Hide password" : "Show password"}
                        >
                          {showStudentPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label>Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showStudentConfirm ? "text" : "password"} value={studentForm.confirm} onChange={e=>setStudentForm(f=>({...f, confirm:e.target.value}))} />
                        <button
                          type="button"
                          onClick={() => setShowStudentConfirm(!showStudentConfirm)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#666'
                          }}
                          aria-label={showStudentConfirm ? "Hide password" : "Show password"}
                        >
                          {showStudentConfirm ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                      </div>
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
                        const res = await fetch(`${getApiBase()}/api/students`, {
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
                        // Automatically refresh the students table
                        fetchStudents()
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
                        const res = await fetch(`${getApiBase()}/api/students/${editStudent.id}`, {
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

                {profileError && <div className="error-message" style={{marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px'}}>{profileError}</div>}
                {profileSuccess && <div className="success-message" style={{marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#efe', color: '#373', borderRadius: '4px'}}>{profileSuccess}</div>}

                {/* Profile View Card */}
                {!editingProfile ? (
                  <div className="card profile-card">
                    {profileLoading ? (
                      <p>Loading profile...</p>
                    ) : (
                      <>
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
                              <label>NAME</label>
                              <p>{`${profile.first_name || ''} ${profile.middle_name || ''} ${profile.last_name || ''}`.trim() || 'Not set'}</p>
                            </div>
                            <div className="profile-field">
                              <label>EMAIL</label>
                              <p>{profile.email || 'Not set'}</p>
                            </div>
                            <div className="profile-field">
                              <label>CONTACT NUMBER</label>
                              <p>{profile.contact_number || 'Not set'}</p>
                            </div>
                            <div className="profile-field">
                              <label>ADDRESS</label>
                              <p>{profile.address || 'Not set'}</p>
                            </div>
                          </div>
                        </div>
                        <button className="btn-primary" onClick={() => setEditingProfile(true)}>Edit Profile</button>
                      </>
                    )}
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
                              // Validate file size (max 2MB)
                              if (file.size > 2 * 1024 * 1024) {
                                setProfileError('Image size must be less than 2MB')
                                return
                              }
                              // Upload to server
                              uploadProfilePhoto(file)
                            }
                          }}
                        />
                        <div className="image-upload-area" onClick={() => profileImageRef.current?.click()} style={{position: 'relative'}}>
                          {profile.img ? (
                            <>
                              <img src={profile.img} alt="profile preview" className="image-preview" />
                              <button 
                                className="btn-ghost" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteProfilePhoto()
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  backgroundColor: 'rgba(255,255,255,0.9)'
                                }}
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <div className="upload-placeholder">Click to upload photo (max 2MB)</div>
                          )}
                        </div>
                      </div>

                      <label>First Name</label>
                      <input value={profile.first_name} onChange={e=>setProfile(p=>({...p, first_name: e.target.value}))} />
                      
                      <label>Middle Name</label>
                      <input value={profile.middle_name} onChange={e=>setProfile(p=>({...p, middle_name: e.target.value}))} />
                      
                      <label>Last Name</label>
                      <input value={profile.last_name} onChange={e=>setProfile(p=>({...p, last_name: e.target.value}))} />
                      
                      <label>Email</label>
                      <input type="email" value={profile.email} onChange={e=>setProfile(p=>({...p, email: e.target.value}))} required />
                      
                      <label>Contact Number</label>
                      <input value={profile.contact_number} onChange={e=>setProfile(p=>({...p, contact_number: e.target.value}))} />
                      
                      <label>Address</label>
                      <textarea value={profile.address} onChange={e=>setProfile(p=>({...p, address: e.target.value}))} rows="3" style={{resize: 'vertical'}} />

                      <h4 style={{marginTop: '1.5rem'}}>Change Password</h4>
                      <label>Current password</label>
                      <input type="password" value={passwords.current} onChange={e=>setPasswords(s=>({...s, current: e.target.value}))} />
                      <label>New password (min 6 characters)</label>
                      <input type="password" value={passwords.new} onChange={e=>setPasswords(s=>({...s, new: e.target.value}))} />
                      <label>Confirm new password</label>
                      <input type="password" value={passwords.confirm} onChange={e=>setPasswords(s=>({...s, confirm: e.target.value}))} />

                      <div className="profile-actions" style={{marginTop: '1rem'}}>
                        <button className="btn-primary" onClick={saveProfile} disabled={profileLoading}>
                          {profileLoading ? 'Saving...' : 'Save Profile'}
                        </button>
                        {(passwords.current || passwords.new || passwords.confirm) && (
                          <button className="btn-secondary" onClick={changePassword} disabled={profileLoading}>
                            {profileLoading ? 'Changing...' : 'Change Password'}
                          </button>
                        )}
                        <button className="btn-ghost" onClick={() => {
                          setEditingProfile(false)
                          setProfileError('')
                          setProfileSuccess('')
                          setPasswords({ current: '', new: '', confirm: '' })
                        }}>Cancel</button>
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
