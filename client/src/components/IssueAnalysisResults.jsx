import './IssueAnalysisResults.css'
import MarkdownRenderer from './MarkdownRenderer'

function IssueAnalysisResults({ results, loading }) {
  if (!results || !results.issue) return null

  const { issue, analysis, commentCount, owner, repo } = results

  return (
    <div className="issue-analysis-results">
      {/* Header */}
      <div className="issue-header">
        <div className="issue-title-row">
          <span className={`issue-state-badge issue-state-${issue.state}`}>
            {issue.state === 'open' ? 'Open' : 'Closed'}
          </span>
          <h2 className="issue-title">{issue.title}</h2>
        </div>
        <div className="issue-meta">
          <span className="issue-meta-item">
            <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
              {owner}/{repo}
            </a>
          </span>
          <span className="issue-meta-item">by {issue.author}</span>
          <span className="issue-meta-item">{commentCount} comments</span>
          {issue.assignees.length > 0 && (
            <span className="issue-meta-item">Assigned to: {issue.assignees.join(', ')}</span>
          )}
        </div>
        {issue.labels.length > 0 && (
          <div className="issue-labels">
            {issue.labels.map(label => (
              <span key={label} className="issue-label">{label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Issue Body */}
      {issue.body && (
        <div className="issue-body-section">
          <h4>Description</h4>
          <div className="issue-body-content">
            <MarkdownRenderer content={issue.body} />
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="issue-analysis-section">
        <h4>AI Analysis</h4>
        {loading && !analysis && (
          <div className="streaming-indicator">
            <span className="pulse"></span>
            Analyzing issue...
          </div>
        )}
        {analysis && <MarkdownRenderer content={analysis} />}
        {loading && analysis && <span className="chat-cursor" />}
      </div>

      {/* Footer */}
      <div className="issue-footer">
        <p className="issue-timestamp">
          Opened {new Date(issue.created_at).toLocaleDateString()}
          {issue.closed_at && ` · Closed ${new Date(issue.closed_at).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  )
}

export default IssueAnalysisResults
