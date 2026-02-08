import { useState, useEffect, useRef, useCallback } from 'react'
import mermaid from 'mermaid'
import './ChangesPanel.css'
import MarkdownRenderer from './MarkdownRenderer'

// Initialize mermaid for impact graph rendering
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#4f7cff',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#4f7cff',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#4f7cff',
    clusterBkg: '#1a2332',
    clusterBorder: '#2a3850',
    titleColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b'
  },
  flowchart: {
    curve: 'basis',
    padding: 15
  }
})

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const DATE_PRESETS = [
  { label: '24h', days: 1 },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 }
]

const SUB_TABS = [
  { id: 'changelog', label: 'Changelog', icon: '📋' },
  { id: 'impact', label: 'Impact Graph', icon: '🔗' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'contributors', label: 'Contributors', icon: '👥' },
  { id: 'ai', label: 'AI Analysis', icon: '🤖' }
]

function ChangesPanel({ repoUrl }) {
  const [mode, setMode] = useState('date')
  const [commits, setCommits] = useState([])
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [commitsError, setCommitsError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customDateRange, setCustomDateRange] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Commit mode
  const [baseCommit, setBaseCommit] = useState('')
  const [headCommit, setHeadCommit] = useState('')

  // Comparison results
  const [compareData, setCompareData] = useState(null)
  const [compareAnalysis, setCompareAnalysis] = useState('')
  const [isComparing, setIsComparing] = useState(false)

  // New data from enhanced SSE
  const [changelog, setChangelog] = useState(null)
  const [contributors, setContributors] = useState(null)
  const [impactGraph, setImpactGraph] = useState(null)

  // Sub-tab state
  const [activeSection, setActiveSection] = useState('changelog')

  // Expanded file diffs
  const [expandedFiles, setExpandedFiles] = useState(new Set())
  const [allFilesExpanded, setAllFilesExpanded] = useState(false)

  // Impact graph rendering
  const [svgContent, setSvgContent] = useState('')
  const [zoom, setZoom] = useState(1)
  const diagramRef = useRef(null)

  // Fetch commits on mount
  useEffect(() => {
    if (!repoUrl) return
    fetchCommits()
  }, [repoUrl])

  // Reset when repoUrl changes
  useEffect(() => {
    setCompareData(null)
    setCompareAnalysis('')
    setChangelog(null)
    setContributors(null)
    setImpactGraph(null)
    setSvgContent('')
    setActiveSection('changelog')
  }, [repoUrl])

  // Render mermaid diagram when impact graph data arrives
  const renderDiagram = useCallback(async (dsl) => {
    if (!dsl || !diagramRef.current) return
    try {
      const { svg } = await mermaid.render('impact-diagram-' + Date.now(), dsl)
      setSvgContent(svg)
    } catch (err) {
      console.error('Mermaid render error:', err)
      setSvgContent('')
    }
  }, [])

  useEffect(() => {
    if (impactGraph?.mermaidDSL && activeSection === 'impact') {
      renderDiagram(impactGraph.mermaidDSL)
    }
  }, [impactGraph, activeSection, renderDiagram])

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
    setCustomDateRange(false)
    const since = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString()
    fetchCommits(since)
  }

  const handleCustomDate = () => {
    setCustomDateRange(true)
    setSelectedPreset(null)
  }

  const handleCustomDateApply = () => {
    if (customFrom) {
      fetchCommits(new Date(customFrom).toISOString())
    }
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
    setChangelog(null)
    setContributors(null)
    setImpactGraph(null)
    setSvgContent('')
    setExpandedFiles(new Set())
    setActiveSection('changelog')

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
            } else if (data.type === 'contributors') {
              setContributors(data)
            } else if (data.type === 'impact_graph') {
              setImpactGraph(data)
            } else if (data.type === 'changelog') {
              setChangelog(data)
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

  const toggleAllFiles = () => {
    if (allFilesExpanded) {
      setExpandedFiles(new Set())
      setAllFilesExpanded(false)
    } else {
      setExpandedFiles(new Set(compareData.files.map(f => f.filename)))
      setAllFilesExpanded(true)
    }
  }

  const copyChangelog = () => {
    if (!changelog) return
    const md = changelogToMarkdown(changelog)
    navigator.clipboard.writeText(md)
  }

  const downloadChangelog = () => {
    if (!changelog) return
    const md = changelogToMarkdown(changelog)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CHANGELOG.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const changelogToMarkdown = (cl) => {
    let md = '# Changelog\n\n'
    if (cl.breakingChanges && cl.breakingChanges.length > 0) {
      md += '## ⚠️ Breaking Changes\n\n'
      cl.breakingChanges.forEach(bc => {
        md += `- **${bc.file}**: ${bc.description} (${bc.severity})\n`
      })
      md += '\n'
    }
    if (cl.sections) {
      cl.sections.filter(s => s.items.length > 0).forEach(section => {
        md += `## ${section.title}\n\n`
        section.items.forEach(item => {
          md += `- ${item.message} (${item.sha || item.shortSha}) — ${item.author}\n`
        })
        md += '\n'
      })
    }
    return md
  }

  const canCompare = mode === 'date'
    ? commits.length >= 2
    : baseCommit && headCommit && baseCommit !== headCommit

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const icons = {
      js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️', py: '🐍', go: '🔵',
      rs: '🦀', java: '☕', json: '📦', md: '📝', css: '🎨', html: '🌐',
      yml: '⚙️', yaml: '⚙️', toml: '⚙️', sh: '🐚', sql: '🗃️'
    }
    return icons[ext] || '📄'
  }

  const renderDiffLines = (patch) => {
    if (!patch) return null
    const lines = patch.split('\n')
    return lines.map((line, i) => {
      let className = 'diff-line'
      if (line.startsWith('+') && !line.startsWith('+++')) className += ' diff-line-add'
      else if (line.startsWith('-') && !line.startsWith('---')) className += ' diff-line-del'
      else if (line.startsWith('@@')) className += ' diff-line-hunk'
      return <div key={i} className={className}>{line}</div>
    })
  }

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
                className={`preset-btn ${selectedPreset === preset.days && !customDateRange ? 'preset-btn-active' : ''}`}
                onClick={() => handleDatePreset(preset)}
                disabled={isComparing}
              >
                {preset.label}
              </button>
            ))}
            <button
              className={`preset-btn ${customDateRange ? 'preset-btn-active' : ''}`}
              onClick={handleCustomDate}
              disabled={isComparing}
            >
              Custom
            </button>
          </div>
        )}

        {mode === 'date' && customDateRange && (
          <div className="custom-date-range">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="date-input"
              placeholder="From"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="date-input"
              placeholder="To"
            />
            <button className="preset-btn preset-btn-active" onClick={handleCustomDateApply}>
              Apply
            </button>
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
          {/* Enhanced Stats Bar */}
          <div className="compare-stats">
            <div className="stats-main">
              <span className="stat-item">{compareData.totalCommits} commits</span>
              <span className="stat-divider">·</span>
              <span className="stat-item">{compareData.filesChanged} files</span>
              <span className="stat-divider">·</span>
              <span className="stat-item stat-additions">+{compareData.additions}</span>
              <span className="stat-item stat-deletions">-{compareData.deletions}</span>
            </div>
            {contributors && (
              <div className="stats-contributors">
                <span className="stat-item">{contributors.summary?.totalAuthors || 0} authors</span>
                {contributors.summary?.topContributor && (
                  <>
                    <span className="stat-divider">·</span>
                    <span className="stat-item stat-highlight">Top: {contributors.summary.topContributor?.name || contributors.summary.topContributor}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="changes-section-tabs">
            {SUB_TABS.map(tab => (
              <button
                key={tab.id}
                className={`changes-section-tab ${activeSection === tab.id ? 'changes-section-tab-active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {tab.id === 'changelog' && changelog?.breakingChanges?.length > 0 && (
                  <span className="tab-badge tab-badge-warning">{changelog.breakingChanges.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ============ CHANGELOG TAB ============ */}
          {activeSection === 'changelog' && (
            <div className="changes-section-content">
              {!changelog && isComparing && (
                <div className="streaming-indicator">
                  <span className="pulse"></span>
                  Generating changelog...
                </div>
              )}
              {changelog && (
                <div className="changelog-content">
                  <div className="changelog-actions">
                    <button className="action-btn" onClick={copyChangelog} title="Copy as Markdown">
                      📋 Copy
                    </button>
                    <button className="action-btn" onClick={downloadChangelog} title="Download CHANGELOG.md">
                      ⬇️ Download
                    </button>
                  </div>

                  {/* Breaking Changes Alert */}
                  {changelog.breakingChanges && changelog.breakingChanges.length > 0 && (
                    <div className="breaking-changes-alert">
                      <div className="breaking-alert-header">
                        ⚠️ {changelog.breakingChanges.length} Breaking Change{changelog.breakingChanges.length > 1 ? 's' : ''} Detected
                      </div>
                      <div className="breaking-alert-items">
                        {changelog.breakingChanges.map((bc, i) => (
                          <div key={i} className="breaking-item">
                            <span className={`breaking-severity breaking-severity-${bc.severity}`}>{bc.severity}</span>
                            <span className="breaking-file">{bc.file}</span>
                            <span className="breaking-desc">{bc.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Changelog Sections */}
                  {changelog.sections && changelog.sections.filter(s => s.items.length > 0).map(section => (
                    <div key={section.type} className="changelog-section">
                      <h4 className="changelog-section-title">{section.title}</h4>
                      <div className="changelog-items">
                        {section.items.map((item, i) => (
                          <div key={i} className="changelog-item">
                            <div className="changelog-item-main">
                              <span className="changelog-message">{item.message}</span>
                            </div>
                            <div className="changelog-item-meta">
                              <span className="changelog-sha">{item.sha || item.shortSha}</span>
                              <span className="changelog-author">{item.author}</span>
                              {item.files && item.files.length > 0 && (
                                <span className="changelog-file-count">{item.files.length} file{item.files.length > 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Highlights */}
                  {changelog.highlights && (
                    <div className="changelog-highlights">
                      <h4>Highlights</h4>
                      <div className="highlights-grid">
                        {changelog.highlights.mostChangedFile && (
                          <div className="highlight-card">
                            <span className="highlight-label">Most Changed File</span>
                            <span className="highlight-value">{changelog.highlights.mostChangedFile.name || changelog.highlights.mostChangedFile}</span>
                          </div>
                        )}
                        {changelog.highlights.topContributor && (
                          <div className="highlight-card">
                            <span className="highlight-label">Top Contributor</span>
                            <span className="highlight-value">{changelog.highlights.topContributor.name || changelog.highlights.topContributor}</span>
                          </div>
                        )}
                        {changelog.highlights.conventionalCommitRatio !== undefined && (
                          <div className="highlight-card">
                            <span className="highlight-label">Conventional Commits</span>
                            <span className="highlight-value">{Math.round(changelog.highlights.conventionalCommitRatio * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ IMPACT GRAPH TAB ============ */}
          {activeSection === 'impact' && (
            <div className="changes-section-content">
              {!impactGraph && isComparing && (
                <div className="streaming-indicator">
                  <span className="pulse"></span>
                  Building impact graph...
                </div>
              )}
              {impactGraph && (
                <div className="impact-graph-content">
                  {/* Graph Stats */}
                  <div className="impact-stats">
                    <div className="impact-stat">
                      <span className="impact-stat-value">{impactGraph.stats?.directChanges || 0}</span>
                      <span className="impact-stat-label">Files Changed</span>
                    </div>
                    <div className="impact-stat">
                      <span className="impact-stat-value">{impactGraph.stats?.rippleAffected || 0}</span>
                      <span className="impact-stat-label">Ripple Affected</span>
                    </div>
                    <div className="impact-stat">
                      <span className="impact-stat-value">{impactGraph.stats?.connections || 0}</span>
                      <span className="impact-stat-label">Connections</span>
                    </div>
                  </div>

                  {/* Color Legend */}
                  <div className="impact-legend">
                    <span className="legend-item"><span className="legend-dot legend-added"></span> Added</span>
                    <span className="legend-item"><span className="legend-dot legend-modified"></span> Modified</span>
                    <span className="legend-item"><span className="legend-dot legend-deleted"></span> Deleted</span>
                    <span className="legend-item"><span className="legend-dot legend-ripple"></span> Ripple Effect</span>
                  </div>

                  {/* Diagram */}
                  <div className="impact-diagram-container">
                    <div className="diagram-controls">
                      <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="zoom-btn">−</button>
                      <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="zoom-btn">+</button>
                      <button onClick={() => setZoom(1)} className="zoom-btn">Reset</button>
                    </div>
                    <div className="impact-diagram-wrapper" style={{ overflow: 'auto' }}>
                      {svgContent ? (
                        <div
                          ref={diagramRef}
                          className="impact-diagram"
                          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                          dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                      ) : (
                        <div ref={diagramRef} className="impact-diagram-placeholder">
                          {impactGraph.mermaidDSL ? 'Rendering diagram...' : 'No dependency connections found between changed files.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw DSL toggle */}
                  {impactGraph.mermaidDSL && (
                    <details className="impact-dsl-details">
                      <summary>View Mermaid DSL</summary>
                      <pre className="impact-dsl-code">{impactGraph.mermaidDSL}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ FILES TAB ============ */}
          {activeSection === 'files' && (
            <div className="changes-section-content">
              <div className="changed-files">
                <div className="files-header">
                  <h4>Changed Files ({compareData.files.length})</h4>
                  <button className="action-btn action-btn-sm" onClick={toggleAllFiles}>
                    {allFilesExpanded ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>
                {compareData.files.map(file => (
                  <div key={file.filename} className="changed-file">
                    <div
                      className="changed-file-header"
                      onClick={() => toggleFileExpand(file.filename)}
                    >
                      <span className={`file-status file-status-${file.status}`}>
                        {file.status === 'added' ? 'A' : file.status === 'removed' ? 'D' : file.status === 'renamed' ? 'R' : 'M'}
                      </span>
                      <span className="file-icon">{getFileIcon(file.filename)}</span>
                      <span className="file-name">{file.filename}</span>
                      <span className="file-stats">
                        <span className="stat-additions">+{file.additions}</span>
                        <span className="stat-deletions">-{file.deletions}</span>
                      </span>
                      <span className="file-expand">{expandedFiles.has(file.filename) ? '▲' : '▼'}</span>
                    </div>
                    {expandedFiles.has(file.filename) && file.patch && (
                      <div className="file-diff">
                        {renderDiffLines(file.patch)}
                      </div>
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

          {/* ============ CONTRIBUTORS TAB ============ */}
          {activeSection === 'contributors' && (
            <div className="changes-section-content">
              {!contributors && isComparing && (
                <div className="streaming-indicator">
                  <span className="pulse"></span>
                  Analyzing contributors...
                </div>
              )}
              {contributors && (
                <div className="contributors-content">
                  {/* Summary */}
                  {contributors.summary && (
                    <div className="contributors-summary">
                      <div className="contrib-summary-stat">
                        <span className="contrib-stat-value">{contributors.summary.totalAuthors}</span>
                        <span className="contrib-stat-label">Authors</span>
                      </div>
                      <div className="contrib-summary-stat">
                        <span className="contrib-stat-value">{contributors.summary.activeDays}</span>
                        <span className="contrib-stat-label">Active Days</span>
                      </div>
                      <div className="contrib-summary-stat">
                        <span className="contrib-stat-value">{contributors.summary.avgCommitsPerDay}</span>
                        <span className="contrib-stat-label">Commits/Day</span>
                      </div>
                    </div>
                  )}

                  {/* Author Cards */}
                  <div className="author-cards">
                    {contributors.authors && contributors.authors.map((author, i) => (
                      <div key={i} className="author-card">
                        <div className="author-card-header">
                          <div className="author-avatar">{author.name.charAt(0).toUpperCase()}</div>
                          <div className="author-info">
                            <span className="author-name">{author.name}</span>
                            <span className="author-commits">{author.commits} commit{author.commits > 1 ? 's' : ''}</span>
                          </div>
                          <span className="author-percentage">{author.percentage}%</span>
                        </div>
                        <div className="author-bar-container">
                          <div className="author-bar" style={{ width: `${author.percentage}%` }}></div>
                        </div>
                        <div className="author-stats">
                          <span className="stat-additions">+{author.estimatedAdditions}</span>
                          <span className="stat-deletions">-{author.estimatedDeletions}</span>
                          <span className="author-files">{Object.keys(contributors.fileOwnership || {}).length || 0} files</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Activity Timeline */}
                  {contributors.activityTimeline && contributors.activityTimeline.length > 0 && (
                    <div className="activity-timeline">
                      <h4>Activity Timeline</h4>
                      <div className="timeline-rows">
                        {contributors.activityTimeline.map((day, i) => (
                          <div key={i} className="timeline-row">
                            <span className="timeline-date">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <div className="timeline-bar-container">
                              <div className="timeline-bar" style={{ width: `${Math.min(100, (day.total || day.commits) * 20)}%` }}></div>
                            </div>
                            <span className="timeline-count">{day.total || day.commits}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Ownership */}
                  {contributors.fileOwnership && Object.keys(contributors.fileOwnership).length > 0 && (
                    <div className="file-ownership">
                      <h4>File Ownership</h4>
                      <div className="ownership-list">
                        {Object.entries(contributors.fileOwnership).slice(0, 15).map(([file, info]) => (
                          <div key={file} className="ownership-row">
                            <span className="ownership-file">{file}</span>
                            <span className="ownership-author">{typeof info === 'string' ? info : info.likelyOwner || 'Unknown'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ AI ANALYSIS TAB ============ */}
          {activeSection === 'ai' && (
            <div className="changes-section-content">
              <div className="compare-analysis">
                <h4>AI Codebase Evolution Analysis</h4>
                {isComparing && !compareAnalysis && (
                  <div className="streaming-indicator">
                    <span className="pulse"></span>
                    Analyzing codebase evolution with AI...
                  </div>
                )}
                {compareAnalysis && <MarkdownRenderer content={compareAnalysis} />}
                {isComparing && compareAnalysis && <span className="chat-cursor" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!compareData && !isComparing && (
        <div className="changes-empty">
          <div className="changes-empty-icon">🔄</div>
          <p>Select a date range or pick two commits to compare how the codebase evolved over time.</p>
          <p className="changes-empty-sub">You'll get a smart changelog, impact graph, contributor analysis, and AI-powered evolution insights.</p>
        </div>
      )}
    </div>
  )
}

export default ChangesPanel
