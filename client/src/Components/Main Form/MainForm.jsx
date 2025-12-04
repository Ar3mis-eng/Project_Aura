import React from 'react'
import './MainForm.css'

// MainForm renders two panels: Student Form and Teacher Form.
// Panels are hidden by default; future login logic should add the
// `active` class to the appropriate panel or render MainForm with a
// `role` prop ("student" | "teacher") to show the correct panel.
export default function MainForm({ role = null }) {
  return (
    <div className="mainform-container">
      <div id="student-panel" className={`panel student-panel ${(role === 'student' || role === 'both') ? 'active' : ''}`}>
        <h2>Student Form</h2>
        <p className="panel-note">Placeholder fields for student submissions. Replace with real inputs later.</p>
        <div className="panel-field">Student ID: <span className="placeholder">[student_id field]</span></div>
        <div className="panel-field">Name: <span className="placeholder">[student_name field]</span></div>
        <div className="panel-field">Grade/Year: <span className="placeholder">[grade field]</span></div>
      </div>

      <div id="teacher-panel" className={`panel teacher-panel ${(role === 'teacher' || role === 'both') ? 'active' : ''}`}>
        <h2>Teacher Form</h2>
        <p className="panel-note">Placeholder fields for teacher submissions. Replace with real inputs later.</p>
        <div className="panel-field">Employee ID: <span className="placeholder">[employee_id field]</span></div>
        <div className="panel-field">Name: <span className="placeholder">[teacher_name field]</span></div>
        <div className="panel-field">Department: <span className="placeholder">[department field]</span></div>
      </div>
    </div>
  )
}
