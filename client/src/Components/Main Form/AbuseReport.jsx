import React, { useEffect, useState } from 'react'
import normalizeTypes from '../../utils/normalizeTypes'
import './MainForm.css'

// Survey flow loads question sets from backend only. No local fallback.

const getApiBase = () => {
  const stored = localStorage.getItem('apiBase')
  return stored && stored.trim() ? stored.trim() : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000')
}

export default function AbuseReport({ onFinish = () => {}, onCancel = () => {}, showIntro: showIntroProp = true }) {
  // Introduction slides state - controlled by prop
  const [showIntro, setShowIntro] = useState(showIntroProp)
  const [introSlide, setIntroSlide] = useState(0)
  
  // Main survey state
  const [step, setStep] = useState(0)
  const [type, setType] = useState('')
  const [answers, setAnswers] = useState({})
  const [otherTypeText, setOtherTypeText] = useState('')
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
          const sortedKeys = normalizeTypes(Object.keys(map))
            // Do not auto-select a type; default is empty so user chooses explicitly
            // leave `type` unchanged (empty) so the placeholder shows
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

  const handleIntroNext = () => {
    console.log('Next button clicked! Current slide:', introSlide)
    if (introSlide < 4) {
      setIntroSlide(prevSlide => {
        console.log('Moving from slide', prevSlide, 'to', prevSlide + 1)
        return prevSlide + 1
      })
    } else {
      console.log('Last slide - closing intro and returning to main')
      onCancel() // Close survey and return to report button
    }
  }

  const handleIntroPrevious = () => {
    console.log('Previous button clicked! Current slide:', introSlide)
    if (introSlide > 0) {
      setIntroSlide(prevSlide => {
        console.log('Moving back from slide', prevSlide, 'to', prevSlide - 1)
        return prevSlide - 1
      })
    }
  }

  const handleSkipIntro = () => {
    console.log('Skip button clicked - returning to main')
    onCancel() // Close survey and return to report button
  }

  const handleChoice = (e) => {
    const val = e.target.value
    setType(val)
    if (!(val && (val.toLowerCase() === 'other' || val.toLowerCase() === 'others'))) setOtherTypeText('')
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
        const payload = { type: (type && (type.toLowerCase() === 'other' || type.toLowerCase() === 'others')) ? `${type} : ${otherTypeText}` : type, answers }
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

  // Intro slides content
  const introSlides = [
    {
      title: "Welcome to Your Safe Space 🌟",
      icon: "🛡️",
      content: "You are brave for being here. This is a safe place where your voice matters and you will be heard.",
      bgColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      emoji: "💙"
    },
    {
      title: "Your Report Can Make a Difference ✨",
      icon: "📢",
      content: "Speaking up about abuse helps protect you and others. When you report, trained adults can help keep everyone safe. You're not alone in this journey.",
      bgColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      emoji: "🌈"
    },
    {
      title: "Why We Created This App 💡",
      icon: "🏠",
      content: "We built this app because every child deserves to feel safe and protected. Your wellbeing matters, and we want to make it easy for you to get help when you need it.",
      bgColor: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      emoji: "🌟"
    },
    {
      title: "How to Use This App 📱",
      icon: "✍️",
      content: "It's simple! Choose the type of situation you want to report, answer a few questions about what happened, and we'll make sure the right people know. You can take your time—there's no rush.",
      bgColor: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      emoji: "👍"
    },
    {
      title: "Let's Get Started 🚀",
      icon: "💪",
      content: "You're doing an amazing thing by speaking up. Remember, you are brave, you are strong, and you are not alone. Let's begin whenever you're ready.",
      bgColor: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      emoji: "🌻"
    }
  ]

  return (
    <div className="survey-container">
      {/* Introduction Slides */}
      {showIntro && (
        <div className="intro-overlay">
          <div className="intro-slide" style={{background: introSlides[introSlide].bgColor}}>
            <div className="intro-icon">{introSlides[introSlide].icon}</div>
            <h2 className="intro-title">{introSlides[introSlide].title}</h2>
            <p className="intro-content">{introSlides[introSlide].content}</p>
            <div className="intro-emoji">{introSlides[introSlide].emoji}</div>
            <div className="intro-progress">
              {introSlides.map((_, idx) => (
                <div key={idx} className={`intro-dot ${idx === introSlide ? 'active' : ''} ${idx < introSlide ? 'completed' : ''}`}></div>
              ))}
            </div>
            <div className="intro-actions">
              {introSlide > 0 && (
                <button className="intro-previous" onClick={handleIntroPrevious}>Previous</button>
              )}
              <button className="intro-skip" onClick={handleSkipIntro}>Skip</button>
              <button className="intro-next" onClick={handleIntroNext}>
                {introSlide === 4 ? "Get Started!" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!showIntro && loading && (
        <div className="survey-step">
          <h3 className="survey-title">Loading question sets…</h3>
          {loadMsg && <div className="survey-error" style={{color:'#666'}}>{loadMsg}</div>}
        </div>
      )}
      {!showIntro && !loading && (
        <>
      {step === 0 && (
        <div className="survey-step safe-space">
          <h3 className="survey-title">Select type of abuse</h3>
          <select value={type} onChange={handleChoice} className="survey-select" disabled={Object.keys(questionSetsMap).length === 0}>
            <option value="">Select type</option>
            {normalizeTypes(Object.keys(questionSetsMap)).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          {(type && (type.toLowerCase() === 'other' || type.toLowerCase() === 'others')) && (
            <div style={{marginTop:'0.75rem'}}>
              <label style={{display:'block', marginBottom:'0.25rem'}}>Please specify</label>
              <input className="survey-input" placeholder="Type the abuse category (e.g., Other - specify)" value={otherTypeText} onChange={e=>setOtherTypeText(e.target.value)} />
            </div>
          )}
          <div className="survey-actions">
            <button
              type="button"
              className="survey-next"
              onClick={() => { setStep(1); setError('') }}
              disabled={!(questionSetsMap[type] && questionSetsMap[type].length) || ((type && (type.toLowerCase() === 'other' || type.toLowerCase() === 'others')) && !otherTypeText.trim())}
            >Start</button>
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
            <div style={{marginBottom:'0.5rem'}}><strong>Type:</strong> {(type && (type.toLowerCase() === 'other' || type.toLowerCase() === 'others')) ? `${type} : ${otherTypeText}` : type}</div>
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
