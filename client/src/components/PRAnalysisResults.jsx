import { useState } from 'react'
import './PRAnalysisResults.css'
import MarkdownRenderer from './MarkdownRenderer'

function PRAnalysisResults({ results, loading }) {
  const [activeTab, setActiveTab] = useState('review')
  const [expandedFiles, setExpandedFiles] = useState(new Set())

  if (!results || !results.pr) return null

  const { pr, files, reviews, analysis, owner, repo } = results

  const toggleFileExpand = (filename) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  const getStateBadgeClass = () => {
    if (pr.merged) return 'pr-state-merged'
    if (pr.state === 'closed') return 'pr-state-closed'
    return 'pr-state-open'
  }

  const getStateLabel = () => {
    if (pr.merged) return 'Merged'
    if (pr.state === 'closed') return 'Closed'
    return 'Open'
  }

  return (
    <div className="pr-analysis-results">
      {/* Header */}
      <div className="pr-header">
        <div className="pr-title-row">
          <span className={`pr-state-badge ${getStateBadgeClass()}`}>{getStateLabel()}</span>
          <h2 className="pr-title">{pr.title}</h2>
        </div>
        <div className="pr-meta">
          <span className="pr-meta-item">
            <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
              {owner}/{repo}
            </a>
          </span>
          <span className="pr-meta-item">by {pr.author}</span>
          <span className="pr-meta-item">{pr.head} → {pr.base}</span>
          <span className="pr-meta-item pr-stat-add">+{pr.additions}</span>
          <span className="pr-meta-item pr-stat-del">-{pr.deletions}</span>
          <span className="pr-meta-item">{pr.changedFiles} files</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pr-tabs">
        <button
          className={`pr-tab ${activeTab === 'review' ? 'pr-tab-active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          AI Review
        </button>
        <button
          className={`pr-tab ${activeTab === 'files' ? 'pr-tab-active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files Changed ({files.length})
        </button>
        {reviews.length > 0 && (
          <button
            className={`pr-tab ${activeTab === 'reviews' ? 'pr-tab-active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="pr-content">
        {activeTab === 'review' && (
          <div className="pr-review-content">
            {loading && !analysis && (
              <div className="streaming-indicator">
                <span className="pulse"></span>
                Reviewing pull request...
              </div>
            )}
            {analysis && <MarkdownRenderer content={analysis} />}
            {loading && analysis && <span className="chat-cursor" />}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="pr-files">
            {files.map(file => (
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
        )}

        {activeTab === 'reviews' && (
          <div className="pr-reviews-list">
            {reviews.map((review, i) => (
              <div key={i} className="pr-review-item">
                <div className="pr-review-header">
                  <span className="pr-reviewer">{review.user}</span>
                  <span className={`pr-review-state pr-review-${review.state.toLowerCase()}`}>
                    {review.state.replace('_', ' ')}
                  </span>
                </div>
                {review.body && (
                  <div className="pr-review-body">
                    <MarkdownRenderer content={review.body} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pr-footer">
        <p className="pr-timestamp">
          Created {new Date(pr.created_at).toLocaleDateString()}
          {pr.merged_at && ` · Merged ${new Date(pr.merged_at).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  )
}

export default PRAnalysisResults
