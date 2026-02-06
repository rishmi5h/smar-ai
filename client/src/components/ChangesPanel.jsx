import { useState, useEffect } from 'react'
import './ChangesPanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const DATE_PRESETS = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 }
]

function ChangesPanel({ repoUrl }) {
  const [mode, setMode] = useState('date')
  const [commits, setCommits] = useState([])
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [commitsError, setCommitsError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(null)

  // Commit mode
  const [baseCommit, setBaseCommit] = useState('')
  const [headCommit, setHeadCommit] = useState('')

  // Comparison results
  const [compareData, setCompareData] = useState(null)
  const [compareAnalysis, setCompareAnalysis] = useState('')
  const [isComparing, setIsComparing] = useState(false)

  // Expanded file diffs
  const [expandedFiles, setExpandedFiles] = useState(new Set())

  // Fetch commits on mount
  useEffect(() => {
    if (!repoUrl) return
    fetchCommits()
  }, [repoUrl])

  const fetchCommits = async (since) => {
    setLoadingCommits(true)
    setCommitsError('')
    try {
      const params = new URLSearchParams({ repoUrl })
      if (since) params.append('since', since)
      params.append('perPage', '30')

      const response = await fetch(`${API_BASE_URL}/commits?${params}`)
      const data = await response.json()
      if (data.success) {
        setCommits(data.commits)
        if (data.commits.length === 0) {
          setCommitsError('No commits found in this range.')
        }
      } else {
        setCommitsError(data.error || 'Failed to load commits. You may need a GitHub token for higher rate limits.')
      }
    } catch (err) {
      setCommitsError('Failed to load commits. Check your connection.')
      console.error('Failed to fetch commits:', err)
    } finally {
      setLoadingCommits(false)
    }
  }

  const handleDatePreset = (preset) => {
    setSelectedPreset(preset.days)
    const since = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString()
    fetchCommits(since)
  }

  const handleCompare = async () => {
    let base, head, baseLabel, headLabel

    if (mode === 'date' && commits.length >= 2) {
      base = commits[commits.length - 1].sha
      head = commits[0].sha
      baseLabel = `${commits[commits.length - 1].shortSha} (oldest)`
      headLabel = `${commits[0].shortSha} (latest)`
    } else if (mode === 'commit' && baseCommit && headCommit) {
      base = baseCommit
      head = headCommit
      const baseC = commits.find(c => c.sha === baseCommit)
      const headC = commits.find(c => c.sha === headCommit)
      baseLabel = baseC ? baseC.shortSha : base.substring(0, 7)
      headLabel = headC ? headC.shortSha : head.substring(0, 7)
    } else {
      return
    }

    setIsComparing(true)
    setCompareData(null)
    setCompareAnalysis('')
    setExpandedFiles(new Set())

    try {
      const response = await fetch(`${API_BASE_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, base, head, baseLabel, headLabel })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Compare failed')
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
            if (data.type === 'metadata') {
              setCompareData({
                totalCommits: data.totalCommits,
                filesChanged: data.filesChanged,
                additions: data.additions,
                deletions: data.deletions,
                files: data.files,
                commits: data.commits
              })
            } else if (data.type === 'analysis_chunk') {
              analysisText += data.text
              setCompareAnalysis(analysisText)
            } else if (data.type === 'error') {
              setCompareAnalysis(`Error: ${data.message}`)
            }
          } catch (e) {
            // skip malformed
          }
        }
      }
    } catch (err) {
      setCompareAnalysis(`Error: ${err.message}`)
    } finally {
      setIsComparing(false)
    }
  }

  const toggleFileExpand = (filename) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  const canCompare = mode === 'date'
    ? commits.length >= 2
    : baseCommit && headCommit && baseCommit !== headCommit

  return (
    <div className="changes-panel">
      {/* Mode Toggle */}
      <div className="changes-controls">
        <div className="changes-mode-toggle">
          <button
            className={`mode-btn ${mode === 'date' ? 'mode-btn-active' : ''}`}
            onClick={() => setMode('date')}
          >
            Date Range
          </button>
          <button
            className={`mode-btn ${mode === 'commit' ? 'mode-btn-active' : ''}`}
            onClick={() => setMode('commit')}
          >
            Commit Range
          </button>
        </div>

        {mode === 'date' && (
          <div className="date-presets">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.days}
                className={`preset-btn ${selectedPreset === preset.days ? 'preset-btn-active' : ''}`}
                onClick={() => handleDatePreset(preset)}
                disabled={isComparing}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {mode === 'commit' && (
          <div className="commit-selectors-wrapper">
            {loadingCommits && (
              <div className="commits-loading">Loading commits...</div>
            )}
            {commitsError && (
              <div className="commits-error">{commitsError}</div>
            )}
            {!loadingCommits && commits.length > 0 && (
              <div className="commit-selectors">
                <div className="commit-select-group">
                  <label>Base (older)</label>
                  <select
                    value={baseCommit}
                    onChange={e => setBaseCommit(e.target.value)}
                    disabled={isComparing}
                  >
                    <option value="">Select commit...</option>
                    {commits.map(c => (
                      <option key={c.sha} value={c.sha}>
                        {c.shortSha} - {c.message.substring(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="commit-select-group">
                  <label>Head (newer)</label>
                  <select
                    value={headCommit}
                    onChange={e => setHeadCommit(e.target.value)}
                    disabled={isComparing}
                  >
                    <option value="">Select commit...</option>
                    {commits.map(c => (
                      <option key={c.sha} value={c.sha}>
                        {c.shortSha} - {c.message.substring(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'date' && loadingCommits && (
          <div className="commits-loading">Loading commits...</div>
        )}
        {mode === 'date' && commitsError && (
          <div className="commits-error">{commitsError}</div>
        )}
        {mode === 'date' && !loadingCommits && commits.length > 0 && (
          <div className="commits-info">
            Found {commits.length} commits in range
          </div>
        )}

        <button
          className="compare-btn"
          onClick={handleCompare}
          disabled={!canCompare || isComparing}
        >
          {isComparing ? 'Analyzing Evolution...' : 'Compare Codebase'}
        </button>
      </div>

      {/* Comparison Results */}
      {compareData && (
        <div className="compare-results">
          <div className="compare-stats">
            <span className="stat-item">{compareData.totalCommits} commits</span>
            <span className="stat-item">{compareData.filesChanged} files changed</span>
            <span className="stat-item stat-additions">+{compareData.additions}</span>
            <span className="stat-item stat-deletions">-{compareData.deletions}</span>
          </div>

          {/* AI Evolution Analysis */}
          <div className="compare-analysis">
            <h4>Codebase Evolution Analysis</h4>
            {isComparing && !compareAnalysis && (
              <div className="streaming-indicator">
                <span className="pulse"></span>
                Comparing codebase snapshots...
              </div>
            )}
            {compareAnalysis && <MarkdownRenderer content={compareAnalysis} />}
            {isComparing && compareAnalysis && <span className="chat-cursor" />}
          </div>

          {/* Changed Files */}
          <div className="changed-files">
            <h4>Changed Files ({compareData.files.length})</h4>
            {compareData.files.map(file => (
              <div key={file.filename} className="changed-file">
                <div
                  className="changed-file-header"
                  onClick={() => toggleFileExpand(file.filename)}
                >
                  <span className={`file-status file-status-${file.status}`}>
                    {file.status === 'added' ? 'A' : file.status === 'removed' ? 'D' : file.status === 'renamed' ? 'R' : 'M'}
                  </span>
                  <span className="file-name">{file.filename}</span>
                  <span className="file-stats">
                    <span className="stat-additions">+{file.additions}</span>
                    <span className="stat-deletions">-{file.deletions}</span>
                  </span>
                  <span className="file-expand">{expandedFiles.has(file.filename) ? '\u25B2' : '\u25BC'}</span>
                </div>
                {expandedFiles.has(file.filename) && file.patch && (
                  <pre className="file-diff">{file.patch}</pre>
                )}
              </div>
            ))}
          </div>

          {/* Commits in Range */}
          {compareData.commits && compareData.commits.length > 0 && (
            <div className="commits-list">
              <h4>Commits in Range ({compareData.commits.length})</h4>
              {compareData.commits.map(commit => (
                <div key={commit.sha} className="commit-row">
                  <span className="commit-sha">{commit.shortSha}</span>
                  <span className="commit-message">{commit.message}</span>
                  <span className="commit-author">{commit.author}</span>
                  <span className="commit-date">{new Date(commit.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!compareData && !isComparing && (
        <div className="changes-empty">
          <p>Select a date range or pick two commits to compare how the codebase evolved over time.</p>
        </div>
      )}
    </div>
  )
}

export default ChangesPanel
