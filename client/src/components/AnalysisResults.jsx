import { useState } from 'react'
import './AnalysisResults.css'
import MarkdownRenderer from './MarkdownRenderer'

function AnalysisResults({ results, loading }) {
  const [copied, setCopied] = useState(false)

  if (!results || !results.repository) {
    return null
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(results.analysis)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([results.analysis], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `${results.repository.owner}-${results.repository.name}-analysis.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const typeLabels = {
    overview: '📋 Code Overview',
    detailed: '📖 Detailed Explanation',
    learning: '🎓 Learning Guide'
  }

  return (
    <div className="analysis-results">
      <div className="results-header">
        <div className="repo-info">
          <h2>
            <a
              href={`https://github.com/${results.repository.owner}/${results.repository.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {results.repository.owner}/{results.repository.name}
            </a>
          </h2>
          <p className="repo-description">{results.repository.description}</p>
          <div className="repo-meta">
            {results.repository.language && (
              <span className="meta-item">
                💻 {results.repository.language}
              </span>
            )}
            <span className="meta-item">
              ⭐ {results.repository.stars.toLocaleString()} stars
            </span>
            <span className="meta-item">
              📁 {results.filesAnalyzed} files analyzed
            </span>
          </div>
          {results.repository.topics && results.repository.topics.length > 0 && (
            <div className="topics">
              {results.repository.topics.slice(0, 5).map((topic) => (
                <span key={topic} className="topic-tag">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="results-actions">
          <div className="analysis-type-badge">
            {typeLabels[results.analysisType]}
          </div>
          <button
            onClick={handleCopy}
            className="action-btn"
            title="Copy to clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="action-btn"
            title="Download as markdown"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      <div className="analysis-content">
        {loading && (
          <div className="streaming-indicator">
            <span className="pulse"></span>
            Analyzing in real-time...
          </div>
        )}
        <MarkdownRenderer content={results.analysis} />
      </div>

      <div className="results-footer">
        <p className="timestamp">
          Generated on {new Date(results.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default AnalysisResults
