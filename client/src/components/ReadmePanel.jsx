import { useState } from 'react'
import './ReadmePanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function ReadmePanel({ repoUrl }) {
  const [loading, setLoading] = useState(false)
  const [readmeContent, setReadmeContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setReadmeContent('')

    try {
      const response = await fetch(`${API_BASE_URL}/readme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate README')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'analysis_chunk') {
              content += data.text
              setReadmeContent(content)
            } else if (data.type === 'error') {
              setError(data.message)
            }
          } catch (e) {
            // skip malformed
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(readmeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!readmeContent) return
    const blob = new Blob([readmeContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'README.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="readme-panel">
      {!readmeContent && !loading && (
        <div className="readme-empty">
          <p>Generate a professional README.md for this repository using AI. The README will include project overview, features, setup instructions, and more.</p>
          <button className="readme-generate-btn" onClick={handleGenerate} disabled={loading}>
            Generate README
          </button>
        </div>
      )}

      {loading && !readmeContent && (
        <div className="streaming-indicator">
          <span className="pulse"></span>
          Generating README...
        </div>
      )}

      {error && (
        <div className="readme-error">{error}</div>
      )}

      {readmeContent && (
        <div className="readme-results">
          <div className="readme-actions">
            <button className="readme-action-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
            <button className="readme-action-btn" onClick={handleDownload}>
              Download README.md
            </button>
            {!loading && (
              <button className="readme-action-btn readme-regenerate-btn" onClick={handleGenerate}>
                Regenerate
              </button>
            )}
          </div>
          <div className="readme-preview">
            <MarkdownRenderer content={readmeContent} />
            {loading && <span className="chat-cursor" />}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReadmePanel
