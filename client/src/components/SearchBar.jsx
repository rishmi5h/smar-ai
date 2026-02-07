import { useState } from 'react'
import './SearchBar.css'

function SearchBar({
  repoUrl,
  setRepoUrl,
  analysisType,
  setAnalysisType,
  useStream,
  setUseStream,
  onAnalyze,
  onClear,
  onExampleSelect,
  loading,
  urlType = 'repo'
}) {
  const [showSettings, setShowSettings] = useState(false)

  const handleExample = (value) => {
    if (loading) return
    onExampleSelect?.(value)
  }

  const urlTypeBadge = urlType === 'pr'
    ? { label: 'Pull Request', className: 'url-badge-pr' }
    : urlType === 'issue'
    ? { label: 'Issue', className: 'url-badge-issue' }
    : null

  return (
    <div className="search-bar">
      <form onSubmit={onAnalyze} className="search-form">
        <div className="input-group">
          {urlTypeBadge && (
            <span className={`url-type-badge ${urlTypeBadge.className}`}>
              {urlTypeBadge.label}
            </span>
          )}
          <input
            type="text"
            placeholder="Paste a GitHub repo, PR, or issue URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            className="search-input"
          />
          {urlType === 'repo' && (
            <select
              id="analysis-type-inline"
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              disabled={loading}
              className="analysis-select-inline"
            >
              <option value="overview">Overview</option>
              <option value="detailed">Detailed</option>
              <option value="learning">Learning</option>
            </select>
          )}
          {repoUrl && (
            <button
              type="button"
              onClick={onClear}
              disabled={loading}
              className="clear-btn-inline"
              aria-label="Clear"
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !repoUrl.trim()}
            className="search-btn"
          >
            {loading
              ? '⏳ Analyzing...'
              : urlType === 'pr'
              ? '🔍 Review PR'
              : urlType === 'issue'
              ? '🔍 Analyze Issue'
              : '🚀 Analyze'}
          </button>
        </div>

        <div className="options-group">
          <div className="option example-inline">
            <span className="example-inline-label">Try</span>
            <button
              type="button"
              className="example-inline-btn"
              onClick={() => handleExample('https://github.com/tailwindlabs/tailwindcss')}
              disabled={loading}
            >
              Tailwind CSS
            </button>
            <button
              type="button"
              className="example-inline-btn"
              onClick={() => handleExample('https://github.com/microsoft/graphrag')}
              disabled={loading}
            >
              GraphRAG
            </button>
            <button
              type="button"
              className="example-inline-btn"
              onClick={() => handleExample('https://github.com/facebook/react')}
              disabled={loading}
            >
              React
            </button>
          </div>

          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings((prev) => !prev)}
            aria-expanded={showSettings}
          >
            ⚙ Settings
          </button>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="option">
              <label htmlFor="use-stream" className="stream-label">
                <input
                  id="use-stream"
                  type="checkbox"
                  checked={useStream}
                  onChange={(e) => setUseStream(e.target.checked)}
                  disabled={loading}
                  className="stream-toggle"
                />
                <span>Stream Results (Real-time)</span>
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default SearchBar
