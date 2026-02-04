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
  loading
}) {
  return (
    <div className="search-bar">
      <form onSubmit={onAnalyze} className="search-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="Paste GitHub repository URL (e.g., https://github.com/owner/repo)"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
            className="search-input"
          />
          <button
            type="submit"
            disabled={loading || !repoUrl.trim()}
            className="search-btn"
          >
            {loading ? '⏳ Analyzing...' : '🚀 Analyze'}
          </button>
        </div>

        <div className="options-group">
          <div className="option">
            <label htmlFor="analysis-type">Analysis Type:</label>
            <select
              id="analysis-type"
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              disabled={loading}
              className="analysis-select"
            >
              <option value="overview">📋 Overview</option>
              <option value="detailed">📖 Detailed Explanation</option>
              <option value="learning">🎓 Learning Guide</option>
            </select>
          </div>

          <div className="option">
            <label htmlFor="use-stream" className="stream-label">
              <input
                id="use-stream"
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
                disabled={loading}
              />
              <span>Stream Results (Real-time)</span>
            </label>
          </div>

          {repoUrl && (
            <button
              type="button"
              onClick={onClear}
              disabled={loading}
              className="clear-btn"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default SearchBar
