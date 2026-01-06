import React, { useEffect, useState } from 'react'
import './MainForm.css'

// Survey flow loads question sets from backend only. No local fallback.

const getApiBase = () => {
  const stored = localStorage.getItem('apiBase')
  return stored && stored.trim() ? stored.trim() : 'http://127.0.0.1:8000'
}

export default function AbuseReport({ onFinish = () => {}, onCancel = () => {} }) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState('Physical')
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [questionSetsMap, setQuestionSetsMap] = useState({})
  const [loadMsg, setLoadMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Load question sets from backend (requires auth token)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const base = getApiBase()
        // Support both keys to match login storage
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        const res = await fetch(`${base}/api/question-sets`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        })
        if (!res.ok) throw new Error(`Failed to load question sets (${res.status})`)
        const data = await res.json()
        // transform list to map: key -> schema
        const map = {}
        for (const item of data) {
          if (item && item.key && Array.isArray(item.schema)) {
            map[item.key] = item.schema
          }
        }
        if (!cancelled) {
          setQuestionSetsMap(map)
          const keys = Object.keys(map)
          if (keys.length && !map[type]) setType(keys[0])
          setLoading(false)
          setLoadMsg('')
        }
      } catch (e) {
        if (!cancelled) {
          setQuestionSetsMap({})
          setLoading(false)
          setLoadMsg('Unable to load question sets. Please log in and ensure the server is running.')
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const steps = ['choose']
  const questionSet = questionSetsMap[type] || []
  // flatten steps: choose -> each question index -> review
  const totalSteps = 1 + questionSet.length + 1

  const handleChoice = (e) => {
    setType(e.target.value)
    setAnswers({})
    setStep(0)
    setError('')
  }

  const handleChange = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
    setError('')
  }

  const validateCurrent = () => {
    if (step === 0) return true
    const q = questionSet[step-1]
    if (!q) return true
    if (q.required === false) return true
    const val = answers[q.id]
    if (val === undefined || val === null) return false
    if (typeof val === 'string' && val.trim() === '') return false
    return true
  }

  const next = () => {
    if (!validateCurrent()) {
      setError('Please answer the current question before continuing.')
      return
    }
    setStep(s => Math.min(s+1, totalSteps-1))
  }
  const back = () => setStep(s => Math.max(s-1, 0))

  const handleSubmit = () => {
    // final validation: ensure all required questions answered
    const missing = questionSet.find(q => q.required !== false && (answers[q.id] === undefined || (typeof answers[q.id] === 'string' && answers[q.id].trim() === '')))
    if (missing) {
      const idx = questionSet.indexOf(missing)
      setError('Please answer all required questions before submitting.')
      setStep(1 + idx)
      return
    }
    const run = async () => {
      try {
        setSubmitting(true)
        setSubmitError('')
        const base = getApiBase()
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        const payload = { type, answers }
        const res = await fetch(`${base}/api/reports`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          let msg = `Failed to submit report (${res.status})`
          try {
            const j = await res.json()
            if (j && j.message) msg = j.message
          } catch {}
          throw new Error(msg)
        }
        const data = await res.json()
        onFinish(data)
      } catch (e) {
        setSubmitError(e.message || 'Submission failed')
      } finally {
        setSubmitting(false)
      }
    }
    run()
  }

  return (
    <div className="survey-container">
      {loading && (
        <div className="survey-step">
          <h3 className="survey-title">Loading question sets…</h3>
          {loadMsg && <div className="survey-error" style={{color:'#666'}}>{loadMsg}</div>}
        </div>
      )}
      {!loading && (
        <>
      {step === 0 && (
        <div className="survey-step">
          <h3 className="survey-title">Select type of abuse</h3>
          <select value={type} onChange={handleChoice} className="survey-select" disabled={Object.keys(questionSetsMap).length === 0}>
            {Object.keys(questionSetsMap).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="survey-actions">
            <button type="button" className="survey-next" onClick={() => { setStep(1); setError('') }} disabled={!(questionSetsMap[type] && questionSetsMap[type].length)}>Start</button>
            <button type="button" className="survey-cancel" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {step > 0 && step <= questionSet.length && (
        (() => {
          const q = questionSet[step-1]
          return (
            <div className="survey-step">
              <h3 className="survey-title">{q.q} {q.required === false && <span style={{fontWeight:600, color:'#666', fontSize:'0.9rem'}}> (optional)</span>}</h3>
              {q.type === 'text' && (
                <textarea
                  className="survey-input"
                  value={answers[q.id] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
              )}
              {q.type === 'choice' && (
                <div className="survey-choices">
                  {q.options.map(opt => (
                    <label key={opt} className="survey-choice"><input type="radio" name={q.id} value={opt} checked={answers[q.id]===opt} onChange={e => handleChange(q.id, e.target.value)} /> {opt}</label>
                  ))}
                </div>
              )}
              {error && <div className="survey-error">{error}</div>}
              <div className="survey-actions">
                <button type="button" className="survey-back" onClick={back}>Back</button>
                <button type="button" className="survey-next" onClick={next}>Next</button>
              </div>
            </div>
          )
        })()
      )}

      {step === totalSteps-1 && (
        <div className="survey-step">
          <h3 className="survey-title">Review & Submit</h3>
          <div className="survey-review">
            <div style={{marginBottom:'0.5rem'}}><strong>Type:</strong> {type}</div>
            {questionSet.length > 0 ? (
              questionSet.map((q, idx) => (
                <div key={q.id || idx} style={{marginBottom:'0.5rem'}}>
                  <div style={{fontWeight:600}}>{q.q || ''}</div>
                  <div>{answers && (q.id in answers) ? String(answers[q.id]) : '—'}</div>
                </div>
              ))
            ) : (
              Object.entries(answers).map(([k,v]) => (
                <div key={k} style={{marginBottom:'0.5rem'}}><div style={{fontWeight:600}}>{k}</div><div>{String(v)}</div></div>
              ))
            )}
          </div>
          <div className="survey-actions">
            <button type="button" className="survey-back" onClick={back} disabled={submitting}>Back</button>
            <button type="button" className="survey-submit" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
          </div>
          {submitError && <div className="survey-error" style={{marginTop:'0.5rem'}}>{submitError}</div>}
        </div>
      )}
        </>
      )}
    </div>
  )
}
