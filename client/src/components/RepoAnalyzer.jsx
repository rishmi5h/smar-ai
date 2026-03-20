import { useState } from 'react'
import axios from 'axios'
import './RepoAnalyzer.css'
import SearchBar from './SearchBar'
import AnalysisResults from './AnalysisResults'
import LoadingSpinner from './LoadingSpinner'
import ChatPanel from './ChatPanel'
import PRAnalysisResults from './PRAnalysisResults'
import IssueAnalysisResults from './IssueAnalysisResults'
import CompareResults from './CompareResults'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const detectUrlType = (url) => {
  if (/\/pull\/\d+/.test(url)) return 'pr'
  if (/\/issues\/\d+/.test(url)) return 'issue'
  return 'repo'
}

function RepoAnalyzer() {
  const [repoUrl, setRepoUrl] = useState('')
  const [analysisType, setAnalysisType] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [useStream, setUseStream] = useState(false)
  const [resultType, setResultType] = useState('repo')
  const [mode, setMode] = useState(() =>
    window.location.hash === '#compare' ? 'compare' : 'single'
  )
  const [compareUrlA, setCompareUrlA] = useState('')
  const [compareUrlB, setCompareUrlB] = useState('')

  const normalizeRepoUrl = (input) => {
    const trimmed = input.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://github.com/${trimmed.replace(/^github\.com\//i, '')}`
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()

    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    const normalizedRepoUrl = normalizeRepoUrl(repoUrl)
    setRepoUrl(normalizedRepoUrl)

    const urlType = detectUrlType(normalizedRepoUrl)
    setResultType(urlType)

    setLoading(true)
    setError('')
    setResults(null)

    try {
      if (urlType === 'pr') {
        await analyzeWithPRStream(normalizedRepoUrl)
      } else if (urlType === 'issue') {
        await analyzeWithIssueStream(normalizedRepoUrl)
      } else if (useStream) {
        await analyzeWithStream(normalizedRepoUrl)
      } else {
        await analyzeWithRegularAPI(normalizedRepoUrl)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeWithRegularAPI = async (normalizedRepoUrl) => {
    const response = await axios.post(`${API_BASE_URL}/analyze`, {
      repoUrl: normalizedRepoUrl,
      analysisType
    })

    setResults(response.data)
  }

  const analyzeWithStream = async (normalizedRepoUrl) => {
    const response = await fetch(`${API_BASE_URL}/analyze-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repoUrl: normalizedRepoUrl, analysisType })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Stream failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let analysisText = ''
    let metadata = null

    const streamResults = {
      analysis: '',
      repository: null,
      analysisType,
      timestamp: new Date().toISOString()
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))

          if (data.type === 'metadata') {
            metadata = data
            streamResults.repository = data.repository
            streamResults.analysisType = data.analysisType
          } else if (data.type === 'analysis_chunk') {
            analysisText += data.text
            streamResults.analysis = analysisText
            setResults({ ...streamResults })
          }
        } catch (e) {
          console.error('Error parsing stream data:', e)
        }
      }
    }

    setResults(streamResults)
  }

  const analyzeWithPRStream = async (prUrl) => {
    const response = await fetch(`${API_BASE_URL}/pr-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prUrl })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'PR analysis failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let analysisText = ''
    const prResults = { pr: null, files: [], reviews: [], analysis: '', owner: '', repo: '' }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'metadata') {
            prResults.pr = data.pr
            prResults.files = data.files
            prResults.reviews = data.reviews
            prResults.owner = data.owner
            prResults.repo = data.repo
            setResults({ ...prResults })
          } else if (data.type === 'analysis_chunk') {
            analysisText += data.text
            prResults.analysis = analysisText
            setResults({ ...prResults })
          }
        } catch (e) {
          // skip malformed
        }
      }
    }

    setResults(prResults)
  }

  const analyzeWithIssueStream = async (issueUrl) => {
    const response = await fetch(`${API_BASE_URL}/issue-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueUrl })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Issue analysis failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let analysisText = ''
    const issueResults = { issue: null, analysis: '', commentCount: 0, owner: '', repo: '' }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'metadata') {
            issueResults.issue = data.issue
            issueResults.commentCount = data.commentCount
            issueResults.owner = data.owner
            issueResults.repo = data.repo
            setResults({ ...issueResults })
          } else if (data.type === 'analysis_chunk') {
            analysisText += data.text
            issueResults.analysis = analysisText
            setResults({ ...issueResults })
          }
        } catch (e) {
          // skip malformed
        }
      }
    }

    setResults(issueResults)
  }

  const handleCompare = async (e) => {
    e.preventDefault()

    if (!compareUrlA.trim() || !compareUrlB.trim()) {
      setError('Please enter both repository URLs')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)
    setResultType('compare')

    try {
      const response = await fetch(`${API_BASE_URL}/compare-repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrlA: normalizeRepoUrl(compareUrlA),
          repoUrlB: normalizeRepoUrl(compareUrlB)
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Comparison failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let analysisText = ''
      const compareResults = { repoA: null, repoB: null, comparison: '' }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'metadata') {
              compareResults.repoA = data.repoA
              compareResults.repoB = data.repoB
              setResults({ ...compareResults })
            } else if (data.type === 'analysis_chunk') {
              analysisText += data.text
              compareResults.comparison = analysisText
              setResults({ ...compareResults })
            }
          } catch (e) {
            // skip malformed
          }
        }
      }

      setResults(compareResults)
    } catch (err) {
      setError(err.message || 'Failed to compare repositories')
      console.error('Compare error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setRepoUrl('')
    setCompareUrlA('')
    setCompareUrlB('')
    setResults(null)
    setError('')
    setResultType('repo')
  }

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return
    setMode(newMode)
    window.location.hash = newMode === 'compare' ? 'compare' : ''
    handleClear()
  }

  const currentUrlType = repoUrl ? detectUrlType(repoUrl) : 'repo'

  return (
    <div className="repo-analyzer">
      <header className="analyzer-hero">
        <div className="hero-content">
          <div className="logo-section">
            <h1 className="brand-title">
              <span className="brand-word">smar</span> <span className="brand-accent">ai</span>
            </h1>
          </div>
          <p className="header-description">Understand any code, fast.</p>

          <div className="mode-toggle">
            <button
              className={`mode-btn${mode === 'single' ? ' mode-active' : ''}`}
              onClick={() => handleModeSwitch('single')}
              disabled={loading}
            >
              Analyze
            </button>
            <button
              className={`mode-btn${mode === 'compare' ? ' mode-active' : ''}`}
              onClick={() => handleModeSwitch('compare')}
              disabled={loading}
            >
              Compare
            </button>
          </div>

          <div className="hero-search">
            {mode === 'single' ? (
              <SearchBar
                repoUrl={repoUrl}
                setRepoUrl={setRepoUrl}
                analysisType={analysisType}
                setAnalysisType={setAnalysisType}
                useStream={useStream}
                setUseStream={setUseStream}
                onAnalyze={handleAnalyze}
                onClear={handleClear}
                onExampleSelect={setRepoUrl}
                loading={loading}
                urlType={currentUrlType}
              />
            ) : (
              <div className="compare-search">
                <form onSubmit={handleCompare} className="compare-form">
                  <div className="compare-inputs">
                    <div className="compare-input-pill">
                      <input
                        type="text"
                        placeholder="e.g. facebook/react"
                        value={compareUrlA}
                        onChange={(e) => setCompareUrlA(e.target.value)}
                        disabled={loading}
                        className="compare-input"
                      />
                      {compareUrlA && (
                        <button
                          type="button"
                          onClick={() => setCompareUrlA('')}
                          disabled={loading}
                          className="compare-clear-btn"
                          aria-label="Clear"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="compare-vs-label">VS</span>
                    <div className="compare-input-pill">
                      <input
                        type="text"
                        placeholder="e.g. vuejs/core"
                        value={compareUrlB}
                        onChange={(e) => setCompareUrlB(e.target.value)}
                        disabled={loading}
                        className="compare-input"
                      />
                      {compareUrlB && (
                        <button
                          type="button"
                          onClick={() => setCompareUrlB('')}
                          disabled={loading}
                          className="compare-clear-btn"
                          aria-label="Clear"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="compare-form-actions">
                    <button
                      type="submit"
                      disabled={loading || !compareUrlA.trim() || !compareUrlB.trim()}
                      className="search-btn compare-submit-btn"
                    >
                      {loading ? '⏳ Comparing...' : '⚔ Compare'}
                    </button>
                    {(compareUrlA || compareUrlB) && (
                      <button
                        type="button"
                        onClick={handleClear}
                        disabled={loading}
                        className="compare-clear-all-btn"
                        aria-label="Clear all"
                        title="Clear all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="compare-examples">
                    <span className="example-inline-label">Try</span>
                    <button type="button" className="example-inline-btn" disabled={loading}
                      onClick={() => { setCompareUrlA('facebook/react'); setCompareUrlB('vuejs/core') }}>
                      React vs Vue
                    </button>
                    <button type="button" className="example-inline-btn" disabled={loading}
                      onClick={() => { setCompareUrlA('expressjs/express'); setCompareUrlB('fastify/fastify') }}>
                      Express vs Fastify
                    </button>
                    <button type="button" className="example-inline-btn" disabled={loading}
                      onClick={() => { setCompareUrlA('pallets/flask'); setCompareUrlB('tiangolo/fastapi') }}>
                      Flask vs FastAPI
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="analyzer-main">
        <div className="container">

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {loading && !results && <LoadingSpinner />}

          {results && resultType === 'repo' && (
            <AnalysisResults
              results={results}
              loading={loading}
              repoUrl={repoUrl}
            />
          )}

          {results && resultType === 'pr' && (
            <PRAnalysisResults
              results={results}
              loading={loading}
            />
          )}

          {results && resultType === 'issue' && (
            <IssueAnalysisResults
              results={results}
              loading={loading}
            />
          )}

          {results && resultType === 'compare' && (
            <CompareResults
              results={results}
              loading={loading}
            />
          )}

          {results && !loading && resultType === 'repo' && (
            <ChatPanel repoUrl={repoUrl} />
          )}

          {!results && !loading && !error && null}
        </div>
      </main>

      <footer className="analyzer-footer">
        <nav aria-label="Footer links">
          <p>
            <span>Powered by</span>
            <a href="https://groq.com" target="_blank" rel="noopener noreferrer">Groq</a>
            <span className="footer-sep">•</span>
            <span>Made by</span>
            <a href="https://github.com/rishmi5h" target="_blank" rel="noopener noreferrer">rishmi5h</a>
            <span className="footer-sep">•</span>
            <a href="https://github.com/rishmi5h/smar-ai" target="_blank" rel="noopener noreferrer">GitHub</a>
          </p>
        </nav>
      </footer>
    </div>
  )
}

export default RepoAnalyzer
