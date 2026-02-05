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

    setLoading(true)
    setError('')
    setResults(null)

    try {
      if (useStream) {
        await analyzeWithStream(normalizedRepoUrl)
      } else {
        await analyzeWithRegularAPI(normalizedRepoUrl)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze repository')
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

  const handleClear = () => {
    setRepoUrl('')
    setResults(null)
    setError('')
  }

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
          <div className="hero-search">
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
            />
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

          {results && (
            <AnalysisResults
              results={results}
              loading={loading}
            />
          )}

          {!results && !loading && !error && null}
        </div>
      </main>

      <footer className="analyzer-footer">
        <p>
          <span>Powered by</span>
          <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">Ollama</a>
          <span className="footer-sep">•</span>
          <span>Made by</span>
          <a href="https://github.com/rishmi5h" target="_blank" rel="noopener noreferrer">rishmi5h</a>
        </p>
      </footer>
    </div>
  )
}

export default RepoAnalyzer
