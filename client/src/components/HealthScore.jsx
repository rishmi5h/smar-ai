import { useState, useEffect } from 'react'
import './HealthScore.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const CATEGORY_META = {
  documentation: { label: 'Documentation', icon: '\ud83d\udcdd' },
  community:     { label: 'Community',     icon: '\ud83d\udc65' },
  codeQuality:   { label: 'Code Quality',  icon: '\u2705' },
  maintenance:   { label: 'Maintenance',   icon: '\ud83d\udd27' },
  devops:        { label: 'DevOps',        icon: '\u2699\ufe0f' }
}

const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return 'var(--color-secondary, #10b981)'
    case 'B': return 'var(--color-primary, #4f7cff)'
    case 'C': return 'var(--color-accent, #f59e0b)'
    default:  return '#ef4444'
  }
}

function CategoryBar({ label, icon, score, max }) {
  const pct = (score / max) * 100
  const barColor = pct >= 75 ? 'var(--color-secondary, #10b981)'
    : pct >= 50 ? 'var(--color-primary, #4f7cff)'
    : pct >= 25 ? 'var(--color-accent, #f59e0b)'
    : '#ef4444'

  return (
    <div className="health-category">
      <div className="health-category-header">
        <span className="health-category-icon">{icon}</span>
        <span className="health-category-label">{label}</span>
        <span className="health-category-score">{score}/{max}</span>
      </div>
      <div className="health-bar-track">
        <div
          className="health-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function HealthScore({ repoUrl }) {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!repoUrl) return

    setLoading(true)
    setHealthData(null)

    fetch(`${API_BASE_URL}/health-score?repoUrl=${encodeURIComponent(repoUrl)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setHealthData(data.healthScore)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [repoUrl])

  if (loading) {
    return (
      <div className="health-score-card health-score-loading">
        <div className="health-skeleton-circle" />
        <div className="health-skeleton-bars">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="health-skeleton-bar" />
          ))}
        </div>
      </div>
    )
  }

  if (!healthData) return null

  const { totalScore, grade, categories } = healthData
  const gradeColor = getGradeColor(grade)
  const scoreDeg = (totalScore / 100) * 360

  return (
    <div className="health-score-card">
      <div className="health-score-left">
        <div
          className="health-score-circle"
          style={{
            background: `conic-gradient(${gradeColor} ${scoreDeg}deg, var(--color-surface-light, #1e293b) ${scoreDeg}deg)`
          }}
        >
          <div className="health-score-inner">
            <span className="health-score-number">{totalScore}</span>
            <span className="health-score-label">/ 100</span>
          </div>
        </div>
        <div className="health-grade" style={{ color: gradeColor }}>
          Grade {grade}
        </div>
      </div>

      <div className="health-score-right">
        <h3 className="health-title">Repository Health</h3>
        <div className="health-categories">
          {Object.entries(categories).map(([key, cat]) => (
            <CategoryBar
              key={key}
              label={CATEGORY_META[key].label}
              icon={CATEGORY_META[key].icon}
              score={cat.score}
              max={cat.max}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HealthScore
