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
  loading
}) {
  const [showSettings, setShowSettings] = useState(false)

  const handleExample = (value) => {
    if (loading) return
    onExampleSelect?.(value)
  }

  return (
    <div className="search-bar">
      <form onSubmit={onAnalyze} className="search-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter a GitHub repo (e.g., owner/repo)"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            className="search-input"
          />
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
            {loading ? '⏳ Analyzing...' : '🚀 Analyze'}
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
              onClick={() => handleExample('https://github.com/vercel/next.js')}
              disabled={loading}
            >
              Next.js
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
