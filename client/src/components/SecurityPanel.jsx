import { useState } from 'react'
import './SecurityPanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function SecurityPanel({ repoUrl }) {
  const [loading, setLoading] = useState(false)
  const [scanPhase, setScanPhase] = useState('')
  const [prescanResults, setPrescanResults] = useState(null)
  const [depResults, setDepResults] = useState(null)
  const [score, setScore] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [copied, setCopied] = useState(false)

  const handleScan = async () => {
    setLoading(true)
    setError('')
    setAnalysis('')
    setPrescanResults(null)
    setDepResults(null)
    setScore(null)
    setScanPhase('scanning')
    setActiveSection('overview')

    try {
      const response = await fetch(`${API_BASE_URL}/security-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to run security scan')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let analysisText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'metadata':
                setScanPhase('secrets')
                break
              case 'prescan_results':
                setPrescanResults(data.secrets)
                setScanPhase('dependencies')
                break
              case 'dependency_results':
                setDepResults(data.dependencies)
                setScanPhase('ai-analysis')
                break
              case 'score':
                setScore(data)
                break
              case 'analysis_chunk':
                analysisText += data.text
                setAnalysis(analysisText)
                break
              case 'error':
                setError(data.message)
                break
              case 'complete':
                break
            }
          } catch (e) {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setScanPhase('')
    }
  }

  const handleCopy = () => {
    const fullReport = buildFullReport()
    navigator.clipboard.writeText(fullReport)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const buildFullReport = () => {
    let report = '# Security Scan Report\n\n'
    if (score) report += `**Grade: ${score.grade}** (${score.score}/100)\n\n`
    if (prescanResults?.findings.length > 0) {
      report += '## Secrets & Vulnerability Patterns\n\n'
      for (const f of prescanResults.findings) {
        report += `- [${f.severity.toUpperCase()}] ${f.name} in \`${f.file}:${f.line}\`\n`
      }
      report += '\n'
    }
    if (depResults?.vulnerabilities.length > 0) {
      report += '## Dependency Vulnerabilities\n\n'
      for (const v of depResults.vulnerabilities) {
        report += `- [${v.severity.toUpperCase()}] ${v.package}@${v.version}: ${v.summary} (fix: ${v.fixedVersion})\n`
      }
      report += '\n'
    }
    if (analysis) {
      report += '## AI Deep Analysis\n\n' + analysis
    }
    return report
  }

  const gradeColor = (grade) => {
    const colors = { A: '#22c55e', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444' }
    return colors[grade] || '#64748b'
  }

  const severityColor = (severity) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', moderate: '#eab308', low: '#3b82f6', info: '#64748b' }
    return colors[severity] || '#64748b'
  }

  return (
    <div className="security-panel">
      {/* Initial empty state */}
      {!score && !loading && (
        <div className="sec-empty">
          <p>Scan this repository for security vulnerabilities, hardcoded secrets, and dependency issues using multi-pass analysis.</p>
          <button className="sec-scan-btn" onClick={handleScan} disabled={loading}>
            Run Security Scan
          </button>
        </div>
      )}

      {/* Progress indicator */}
      {loading && !score && (
        <div className="sec-progress">
          <div className="sec-progress-steps">
            <div className={`sec-step ${scanPhase === 'secrets' || scanPhase === 'dependencies' || scanPhase === 'ai-analysis' ? 'sec-step-done' : scanPhase === 'scanning' ? 'sec-step-active' : ''}`}>
              <span className="sec-step-dot" />
              <span>Fetching code</span>
            </div>
            <div className={`sec-step ${scanPhase === 'dependencies' || scanPhase === 'ai-analysis' ? 'sec-step-done' : scanPhase === 'secrets' ? 'sec-step-active' : ''}`}>
              <span className="sec-step-dot" />
              <span>Scanning secrets</span>
            </div>
            <div className={`sec-step ${scanPhase === 'ai-analysis' ? 'sec-step-done' : scanPhase === 'dependencies' ? 'sec-step-active' : ''}`}>
              <span className="sec-step-dot" />
              <span>Checking dependencies</span>
            </div>
            <div className={`sec-step ${scanPhase === 'ai-analysis' ? 'sec-step-active' : ''}`}>
              <span className="sec-step-dot" />
              <span>AI deep analysis</span>
            </div>
          </div>
          <div className="streaming-indicator">
            <span className="pulse"></span>
            {scanPhase === 'scanning' && 'Fetching repository code...'}
            {scanPhase === 'secrets' && 'Scanning for secrets and vulnerability patterns...'}
            {scanPhase === 'dependencies' && 'Checking dependencies for known CVEs...'}
            {scanPhase === 'ai-analysis' && 'Running AI deep security analysis...'}
          </div>
        </div>
      )}

      {error && <div className="sec-error">{error}</div>}

      {/* Score dashboard */}
      {score && (
        <>
          <div className="sec-dashboard">
            <div className="sec-grade-card" style={{ borderColor: gradeColor(score.grade) }}>
              <div className="sec-grade" style={{ color: gradeColor(score.grade) }}>{score.grade}</div>
              <div className="sec-score-num">{score.score}/100</div>
            </div>
            <div className="sec-stats">
              {prescanResults && (
                <>
                  <div className="sec-stat">
                    <span className="sec-stat-num" style={{ color: '#ef4444' }}>{prescanResults.summary.critical}</span>
                    <span className="sec-stat-label">Critical</span>
                  </div>
                  <div className="sec-stat">
                    <span className="sec-stat-num" style={{ color: '#f97316' }}>{prescanResults.summary.high}</span>
                    <span className="sec-stat-label">High</span>
                  </div>
                  <div className="sec-stat">
                    <span className="sec-stat-num" style={{ color: '#eab308' }}>{prescanResults.summary.medium}</span>
                    <span className="sec-stat-label">Medium</span>
                  </div>
                  <div className="sec-stat">
                    <span className="sec-stat-num" style={{ color: '#3b82f6' }}>{prescanResults.summary.low}</span>
                    <span className="sec-stat-label">Low</span>
                  </div>
                </>
              )}
              <div className="sec-stat">
                <span className="sec-stat-num">{prescanResults?.summary.filesScanned || 0}</span>
                <span className="sec-stat-label">Files Scanned</span>
              </div>
            </div>
            <div className="sec-dashboard-actions">
              <button className="sec-action-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Report'}
              </button>
              {!loading && (
                <button className="sec-action-btn sec-rescan-btn" onClick={handleScan}>
                  Rescan
                </button>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="sec-section-tabs">
            <button
              className={`sec-section-tab ${activeSection === 'overview' ? 'sec-section-tab-active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>
            <button
              className={`sec-section-tab ${activeSection === 'secrets' ? 'sec-section-tab-active' : ''}`}
              onClick={() => setActiveSection('secrets')}
            >
              Secrets ({prescanResults?.summary.secretsFound || 0})
            </button>
            <button
              className={`sec-section-tab ${activeSection === 'deps' ? 'sec-section-tab-active' : ''}`}
              onClick={() => setActiveSection('deps')}
            >
              Dependencies ({depResults?.summary.vulnerableDependencies || 0})
            </button>
            <button
              className={`sec-section-tab ${activeSection === 'ai' ? 'sec-section-tab-active' : ''}`}
              onClick={() => setActiveSection('ai')}
            >
              AI Analysis
            </button>
          </div>

          {/* Section content */}
          <div className="sec-section-content">
            {activeSection === 'overview' && (
              <div className="sec-overview">
                <h4>Security Overview</h4>
                {prescanResults && prescanResults.findings.length > 0 ? (
                  <div className="sec-findings-summary">
                    <p>{prescanResults.summary.totalFindings} issue{prescanResults.summary.totalFindings !== 1 ? 's' : ''} found across {prescanResults.summary.filesScanned} files.</p>
                    {Object.entries(prescanResults.summary.categoryCounts).length > 0 && (
                      <div className="sec-category-list">
                        {Object.entries(prescanResults.summary.categoryCounts).map(([cat, count]) => (
                          <span key={cat} className="sec-category-tag">{cat}: {count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="sec-clean-msg">No secrets or vulnerability patterns detected by automated scan.</p>
                )}
                {depResults && depResults.vulnerabilities.length > 0 && (
                  <div className="sec-dep-summary">
                    <p>{depResults.summary.vulnerableDependencies} vulnerable dependenc{depResults.summary.vulnerableDependencies !== 1 ? 'ies' : 'y'} found out of {depResults.summary.totalDependencies} total.</p>
                  </div>
                )}
                {depResults && depResults.vulnerabilities.length === 0 && depResults.summary.totalDependencies > 0 && (
                  <p className="sec-clean-msg">No known dependency vulnerabilities found ({depResults.summary.totalDependencies} dependencies checked).</p>
                )}
              </div>
            )}

            {activeSection === 'secrets' && (
              <div className="sec-secrets">
                <h4>Secrets & Vulnerability Patterns</h4>
                {prescanResults?.findings.length > 0 ? (
                  <div className="sec-findings-list">
                    {prescanResults.findings.map((f, i) => (
                      <div key={i} className="sec-finding-row">
                        <span className="sec-severity-badge" style={{ backgroundColor: severityColor(f.severity) }}>
                          {f.severity}
                        </span>
                        <div className="sec-finding-details">
                          <span className="sec-finding-name">{f.name}</span>
                          <span className="sec-finding-location">{f.file}:{f.line}</span>
                          {f.match && <code className="sec-finding-match">{f.match}</code>}
                          {f.owasp && <span className="sec-finding-owasp">{f.owasp}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sec-clean-msg">No secrets or vulnerability patterns found.</p>
                )}
              </div>
            )}

            {activeSection === 'deps' && (
              <div className="sec-deps">
                <h4>Dependency Vulnerabilities</h4>
                {depResults?.vulnerabilities.length > 0 ? (
                  <div className="sec-dep-list">
                    {depResults.vulnerabilities.map((v, i) => (
                      <div key={i} className="sec-dep-card">
                        <div className="sec-dep-header">
                          <span className="sec-severity-badge" style={{ backgroundColor: severityColor(v.severity) }}>
                            {v.severity}
                          </span>
                          <span className="sec-dep-name">{v.package}@{v.version}</span>
                        </div>
                        <p className="sec-dep-summary">{v.summary}</p>
                        <div className="sec-dep-meta">
                          <span>Fix: <strong>{v.fixedVersion}</strong></span>
                          {v.ghsaId && <span className="sec-dep-ghsa">{v.ghsaId}</span>}
                          <span className="sec-dep-file">{v.file}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sec-clean-msg">
                    {depResults?.summary.totalDependencies > 0
                      ? `No known vulnerabilities found in ${depResults.summary.totalDependencies} dependencies.`
                      : 'No manifest files (package.json, requirements.txt, etc.) found.'}
                  </p>
                )}
              </div>
            )}

            {activeSection === 'ai' && (
              <div className="sec-ai-analysis">
                <h4>AI Deep Analysis</h4>
                {loading && !analysis && (
                  <div className="streaming-indicator">
                    <span className="pulse"></span>
                    Running AI security analysis...
                  </div>
                )}
                {analysis && <MarkdownRenderer content={analysis} />}
                {loading && analysis && <span className="chat-cursor" />}
              </div>
            )}
          </div>
        </>
      )}

      {/* Show AI analysis streaming progress when score is ready but analysis is still loading */}
      {loading && score && activeSection !== 'ai' && (
        <div className="sec-streaming-note">
          <span className="pulse"></span>
          AI analysis is streaming... Click "AI Analysis" tab to view.
        </div>
      )}
    </div>
  )
}

export default SecurityPanel
