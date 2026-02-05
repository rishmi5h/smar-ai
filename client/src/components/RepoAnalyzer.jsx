import { useState } from 'react'
import axios from 'axios'
import './RepoAnalyzer.css'
import SearchBar from './SearchBar'
import AnalysisResults from './AnalysisResults'
import LoadingSpinner from './LoadingSpinner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function RepoAnalyzer() {
  const [repoUrl, setRepoUrl] = useState('')
  const [analysisType, setAnalysisType] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [useStream, setUseStream] = useState(false)

  const handleAnalyze = async (e) => {
    e.preventDefault()

    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    try {
      if (useStream) {
        await analyzeWithStream()
      } else {
        await analyzeWithRegularAPI()
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze repository')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeWithRegularAPI = async () => {
    const response = await axios.post(`${API_BASE_URL}/analyze`, {
      repoUrl,
      analysisType
    })

    setResults(response.data)
  }

  const analyzeWithStream = async () => {
    const response = await fetch(`${API_BASE_URL}/analyze-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repoUrl, analysisType })
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

  const handleClear = () => {
    setRepoUrl('')
    setResults(null)
    setError('')
  }

  return (
    <div className="repo-analyzer">
      <header className="analyzer-header">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">🧠</span>
            <h1 className="brand-title">
              <span className="brand-word">smart</span><span className="brand-dash">-</span><span className="brand-accent">ai</span>
            </h1>
          </div>
          <p className="header-subtitle">Your Code, Remembered</p>
          <p className="header-description">Understand any GitHub repository with AI-powered analysis</p>
        </div>
      </header>

      <main className="analyzer-main">
        <div className="container">
          <SearchBar
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            analysisType={analysisType}
            setAnalysisType={setAnalysisType}
            useStream={useStream}
            setUseStream={setUseStream}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            loading={loading}
          />

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {loading && !results && <LoadingSpinner />}

          {results && (
            <AnalysisResults
              results={results}
              loading={loading}
            />
          )}

          {!results && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h2>Ready to Analyze</h2>
              <p>Enter a GitHub repository URL above to get started</p>
              <div className="example-repos">
                <p className="example-label">Try these examples:</p>
                <div className="repo-examples">
                  <button
                    className="example-btn"
                    onClick={() => setRepoUrl('https://github.com/tailwindlabs/tailwindcss')}
                  >
                    tailwindlabs/tailwindcss
                  </button>
                  <button
                    className="example-btn"
                    onClick={() => setRepoUrl('https://github.com/vercel/next.js')}
                  >
                    vercel/next.js
                  </button>
                  <button
                    className="example-btn"
                    onClick={() => setRepoUrl('https://github.com/facebook/react')}
                  >
                    facebook/react
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="analyzer-footer">
        <p>
          Powered by <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">Ollama</a>. Built with React & Node.js.{" "}
          <a href="https://github.com/rishmi5h" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
    </div>
  )
}

export default RepoAnalyzer
