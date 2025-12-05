import React, { useState } from 'react'
import './MainForm.css'

// A small, local survey/quiz flow for abuse reporting.
// - Starts with a selection of abuse type
// - Presents a short sequence of questions based on that choice
// - Hides the initial "report" button while the survey runs
// - Calls `onFinish(data)` with collected answers when submitted

const QUESTION_SETS = {
  Physical: [
    { id: 'physical_when', q: 'When did this happen?', type: 'text', required: true },
    { id: 'physical_where', q: 'Where did it happen (room/place)?', type: 'text', required: true },
    { id: 'physical_who', q: 'Who was involved? (names, roles, relation to you)', type: 'text', required: true },
    { id: 'physical_description', q: 'Describe what happened in your own words', type: 'text', required: true },
    { id: 'physical_injury', q: 'Were you physically injured?', type: 'choice', options: ['Yes','No'], required: true },
    { id: 'physical_medical', q: 'Did you seek medical attention?', type: 'choice', options: ['Yes','No'], required: true },
    { id: 'physical_witnesses', q: 'Were there any witnesses? If so, who?', type: 'text', required: false },
    { id: 'physical_evidence', q: 'Do you have any evidence (photos, messages)?', type: 'choice', options: ['Yes','No'], required: false },
    { id: 'physical_repeat', q: 'Has this happened before?', type: 'choice', options: ['Yes','No','Not sure'], required: true },
    { id: 'physical_perpetrator', q: 'Would you want to tell us who did it? (optional — you may skip)', type: 'text', required: false },
  ],
  Verbal: [
    { id: 'verbal_what', q: 'What was said or done (quote if possible)?', type: 'text', required: true },
    { id: 'verbal_who', q: 'Who said it? (name/role)', type: 'text', required: true },
    { id: 'verbal_where', q: 'Where did it happen?', type: 'text', required: true },
    { id: 'verbal_frequency', q: 'How often does this happen?', type: 'choice', options: ['Once','Occasionally','Frequently'], required: true },
    { id: 'verbal_effect', q: 'How did it make you feel or affect you?', type: 'text', required: true },
    { id: 'verbal_witnesses', q: 'Were there witnesses or others who heard it?', type: 'text', required: false },
    { id: 'verbal_perpetrator', q: 'Would you want to tell us who did it? (optional — you may skip)', type: 'text', required: false },
  ],
  Sexual: [
    { id: 'sexual_when', q: 'When did this occur (date/time)?', type: 'text', required: true },
    { id: 'sexual_where', q: 'Where did it happen?', type: 'text', required: true },
    { id: 'sexual_description', q: 'Describe what happened (as much as you are comfortable sharing)', type: 'text', required: true },
    { id: 'sexual_consent', q: 'Was there consent?', type: 'choice', options: ['Yes','No','Not sure'], required: true },
    { id: 'sexual_force', q: 'Was there any use of force or threats?', type: 'choice', options: ['Yes','No'], required: true },
    { id: 'sexual_injury', q: 'Were there injuries?', type: 'choice', options: ['Yes','No'], required: false },
    { id: 'sexual_medical', q: 'Did you seek medical support?', type: 'choice', options: ['Yes','No'], required: false },
    { id: 'sexual_reported_before', q: 'Have you reported this to anyone else before?', type: 'choice', options: ['Yes','No'], required: false },
    { id: 'sexual_perpetrator', q: 'Would you want to tell us who did it? (optional — you may skip)', type: 'text', required: false },
  ],
  Bullying: [
    { id: 'bully_who', q: 'Who is bullying you? (names/roles)', type: 'text', required: true },
    { id: 'bully_where', q: 'Where does it happen (classroom, online, etc.)?', type: 'text', required: true },
    { id: 'bully_frequency', q: 'How often does it happen?', type: 'choice', options: ['Once','Occasionally','Frequently'], required: true },
    { id: 'bully_examples', q: 'Provide short examples (one per line)', type: 'text', required: true },
    { id: 'bully_effect', q: 'How has this affected your school life or wellbeing?', type: 'text', required: true },
    { id: 'bully_support', q: 'Have you told anyone or asked for help?', type: 'choice', options: ['Yes','No'], required: false },
    { id: 'bully_perpetrator', q: 'Would you want to tell us who did it? (optional — you may skip)', type: 'text', required: false },
  ],
  Other: [
    { id: 'other_describe', q: 'Please describe the issue in as much detail as you can', type: 'text', required: true },
    { id: 'other_when', q: 'When did it happen?', type: 'text', required: false },
    { id: 'other_where', q: 'Where did it happen?', type: 'text', required: false },
    { id: 'other_perpetrator', q: 'Would you want to tell us who did it? (optional — you may skip)', type: 'text', required: false },
  ]
}

export default function AbuseReport({ onFinish = () => {}, onCancel = () => {} }) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState('Physical')
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')

  const steps = ['choose']
  const questionSet = QUESTION_SETS[type] || []
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
    const payload = { type, answers }
    console.log('Abuse report submitted', payload)
    onFinish(payload)
  }

  return (
    <div className="survey-container">
      {step === 0 && (
        <div className="survey-step">
          <h3 className="survey-title">Select type of abuse</h3>
          <select value={type} onChange={handleChoice} className="survey-select">
            {Object.keys(QUESTION_SETS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="survey-actions">
            <button type="button" className="survey-next" onClick={() => { setStep(1); setError('') }}>Start</button>
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
                <input className="survey-input" value={answers[q.id] || ''} onChange={e => handleChange(q.id, e.target.value)} />
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
            <div><strong>Type:</strong> {type}</div>
            {Object.entries(answers).map(([k,v]) => (
              <div key={k}><strong>{k}:</strong> {String(v)}</div>
            ))}
          </div>
          <div className="survey-actions">
            <button type="button" className="survey-back" onClick={back}>Back</button>
            <button type="button" className="survey-submit" onClick={handleSubmit}>Submit Report</button>
          </div>
        </div>
      )}
    </div>
  )
}
