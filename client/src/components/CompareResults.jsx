import { useState } from 'react'
import './CompareResults.css'
import MarkdownRenderer from './MarkdownRenderer'

function CompareResults({ results, loading }) {
  const [copied, setCopied] = useState(false)

  if (!results) return null

  const { repoA, repoB, comparison } = results

  const handleCopy = () => {
    if (!comparison) return
    navigator.clipboard.writeText(comparison)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!comparison) return
    const element = document.createElement('a')
    const file = new Blob([comparison], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `compare-${repoA?.name}-vs-${repoB?.name}.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const formatNumber = (n) => {
    if (n == null) return 'N/A'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  const StatBar = ({ label, valueA, valueB }) => {
    const numA = valueA ?? 0
    const numB = valueB ?? 0
    const max = Math.max(numA, numB, 1)
    return (
      <div className="compare-stat-row">
        <span className="compare-stat-label">{label}</span>
        <div className="compare-stat-bars">
          <div className="compare-stat-bar-wrap repo-a-side">
            <span className={`compare-stat-value${numA >= numB && numA > 0 ? ' stat-winner' : ''}`}>{formatNumber(valueA)}</span>
            <div className="compare-bar-track">
              <div className="compare-bar-fill bar-a" style={{ width: `${(numA / max) * 100}%` }} />
            </div>
          </div>
          <div className="compare-stat-bar-wrap repo-b-side">
            <div className="compare-bar-track">
              <div className="compare-bar-fill bar-b" style={{ width: `${(numB / max) * 100}%` }} />
            </div>
            <span className={`compare-stat-value${numB >= numA && numB > 0 ? ' stat-winner' : ''}`}>{formatNumber(valueB)}</span>
          </div>
        </div>
      </div>
    )
  }

  const RepoCard = ({ repo, side }) => {
    if (!repo) return null
    return (
      <div className={`compare-repo-card ${side}`}>
        <h3>
          <a
            href={`https://github.com/${repo.owner}/${repo.name}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {repo.owner}/{repo.name}
          </a>
        </h3>
        <p className="compare-repo-desc">{repo.description || 'No description'}</p>
        <div className="compare-repo-badges">
          {repo.language && <span className="compare-badge lang-badge">{repo.language}</span>}
          {repo.license && <span className="compare-badge license-badge">{repo.license}</span>}
          <span className="compare-badge files-badge">{repo.filesAnalyzed} files analyzed</span>
        </div>
        {repo.topics?.length > 0 && (
          <div className="compare-topics">
            {repo.topics.slice(0, 5).map(t => (
              <span key={t} className="compare-topic">{t}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="compare-results">
      <div className="compare-header">
        <RepoCard repo={repoA} side="side-a" />
        <div className="compare-vs">VS</div>
        <RepoCard repo={repoB} side="side-b" />
      </div>

      {(repoA && repoB) && (
        <div className="compare-stats-section">
          <StatBar label="Stars" valueA={repoA.stars} valueB={repoB.stars} />
          <StatBar label="Forks" valueA={repoA.forks} valueB={repoB.forks} />
          <StatBar label="Open Issues" valueA={repoA.openIssues} valueB={repoB.openIssues} />
          <StatBar label="Contributors" valueA={repoA.contributors} valueB={repoB.contributors} />
        </div>
      )}

      <div className="compare-analysis-section">
        <div className="compare-analysis-header">
          <h3>AI Comparison</h3>
          {comparison && !loading && (
            <div className="compare-actions">
              <button className="compare-action-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className="compare-action-btn" onClick={handleDownload}>
                Download
              </button>
            </div>
          )}
        </div>
        {comparison ? (
          <div className="compare-analysis-content">
            <MarkdownRenderer content={comparison} />
          </div>
        ) : loading ? (
          <div className="compare-loading">Analyzing both repositories...</div>
        ) : null}
        {loading && comparison && (
          <div className="compare-streaming-indicator">Streaming...</div>
        )}
      </div>
    </div>
  )
}

export default CompareResults
