import { useState, useRef } from 'react'
import './AnalysisResults.css'
import MarkdownRenderer from './MarkdownRenderer'
import ChangesPanel from './ChangesPanel'
import ArchitecturePanel from './ArchitecturePanel'
import ReadmePanel from './ReadmePanel'
import PromptPanel from './PromptPanel'
import SecurityPanel from './SecurityPanel'

function AnalysisResults({ results, loading, repoUrl }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('analysis')
  const tabsRef = useRef(null)

  const handleTabClick = (tab, e) => {
    setActiveTab(tab)
    // Scroll the clicked tab into view within the tabs container
    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

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
    overview: 'Code Overview',
    detailed: 'Detailed Explanation',
    learning: 'Learning Guide'
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
                {results.repository.language}
              </span>
            )}
            <span className="meta-item">
              {results.repository.stars.toLocaleString()} stars
            </span>
            <span className="meta-item">
              {results.filesAnalyzed} files analyzed
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
          {activeTab === 'analysis' && (
            <>
              <div className="analysis-type-badge">
                {typeLabels[results.analysisType]}
              </div>
              <button
                onClick={handleCopy}
                className="action-btn"
                title="Copy to clipboard"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="action-btn"
                title="Download as markdown"
              >
                Download
              </button>
            </>
          )}
        </div>
      </div>

      <div className="results-tabs" ref={tabsRef}>
        <button
          className={`results-tab ${activeTab === 'analysis' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('analysis', e)}
        >
          Analysis
        </button>
        <button
          className={`results-tab ${activeTab === 'changes' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('changes', e)}
        >
          Changes
        </button>
        <button
          className={`results-tab ${activeTab === 'architecture' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('architecture', e)}
        >
          Architecture
        </button>
        <button
          className={`results-tab ${activeTab === 'readme' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('readme', e)}
        >
          README
        </button>
        <button
          className={`results-tab ${activeTab === 'prompts' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('prompts', e)}
        >
          Prompts
        </button>
        <button
          className={`results-tab ${activeTab === 'security' ? 'results-tab-active' : ''}`}
          onClick={(e) => handleTabClick('security', e)}
        >
          Security
        </button>
      </div>

      {activeTab === 'analysis' && (
        <div className="analysis-content">
          {loading && (
            <div className="streaming-indicator">
              <span className="pulse"></span>
              Analyzing in real-time...
            </div>
          )}
          <MarkdownRenderer content={results.analysis} />
        </div>
      )}

      {activeTab === 'changes' && (
        <div className="analysis-content">
          <ChangesPanel repoUrl={repoUrl} />
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="analysis-content">
          <ArchitecturePanel repoUrl={repoUrl} />
        </div>
      )}

      {activeTab === 'readme' && (
        <div className="analysis-content">
          <ReadmePanel repoUrl={repoUrl} />
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="analysis-content">
          <PromptPanel repoUrl={repoUrl} />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="analysis-content">
          <SecurityPanel repoUrl={repoUrl} />
        </div>
      )}

      <div className="results-footer">
        <p className="timestamp">
          Generated on {new Date(results.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default AnalysisResults
