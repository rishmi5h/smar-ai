import { useState } from 'react'
import './PromptPanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const PROMPT_TYPES = [
  { value: 'recreate', label: 'Recreate This Project', description: 'Full blueprint to rebuild from scratch' },
  { value: 'feature', label: 'Add a Feature', description: 'Convention-aware feature implementation guide' },
  { value: 'review', label: 'Code Review', description: 'Context-rich code review prompt' },
  { value: 'migrate', label: 'Convert / Migrate', description: 'Stack migration strategy and mapping' }
]

const MIGRATION_TARGETS = [
  'JavaScript to TypeScript',
  'React to Next.js',
  'Express to Fastify',
  'REST API to GraphQL',
  'Python Flask to FastAPI',
  'CommonJS to ESM',
  'Custom...'
]

function PromptPanel({ repoUrl }) {
  const [promptType, setPromptType] = useState('recreate')
  const [userInput, setUserInput] = useState('')
  const [migrationTarget, setMigrationTarget] = useState(MIGRATION_TARGETS[0])
  const [customTarget, setCustomTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const [promptContent, setPromptContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('raw')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setPromptContent('')

    let finalInput = userInput
    if (promptType === 'migrate') {
      finalInput = migrationTarget === 'Custom...' ? customTarget : migrationTarget
    }

    try {
      const response = await fetch(`${API_BASE_URL}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, promptType, userInput: finalInput })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate prompt')
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
              setPromptContent(content)
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
    navigator.clipboard.writeText(promptContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!promptContent) return
    const blob = new Blob([promptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-${promptType}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const needsInput = promptType === 'feature'
  const needsMigration = promptType === 'migrate'
  const canGenerate = !loading && (!needsInput || userInput.trim()) && (!needsMigration || migrationTarget !== 'Custom...' || customTarget.trim())

  return (
    <div className="prompt-panel">
      {!promptContent && !loading && (
        <div className="prompt-setup">
          <p className="prompt-description">
            Generate copy-pasteable prompts you can give to any LLM or AI agent to work with this codebase.
          </p>

          <div className="prompt-type-selector">
            {PROMPT_TYPES.map(type => (
              <button
                key={type.value}
                className={`prompt-type-btn ${promptType === type.value ? 'prompt-type-active' : ''}`}
                onClick={() => {
                  setPromptType(type.value)
                  setUserInput('')
                  setError('')
                }}
              >
                <span className="prompt-type-label">{type.label}</span>
                <span className="prompt-type-desc">{type.description}</span>
              </button>
            ))}
          </div>

          {needsInput && (
            <div className="prompt-input-section">
              <label className="prompt-input-label">Describe the feature to add</label>
              <textarea
                className="prompt-textarea"
                placeholder="e.g., Add a dark mode toggle with persistent user preference..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {needsMigration && (
            <div className="prompt-input-section">
              <label className="prompt-input-label">Migration target</label>
              <select
                className="prompt-select"
                value={migrationTarget}
                onChange={e => setMigrationTarget(e.target.value)}
              >
                {MIGRATION_TARGETS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {migrationTarget === 'Custom...' && (
                <input
                  className="prompt-text-input"
                  type="text"
                  placeholder="e.g., React to Svelte"
                  value={customTarget}
                  onChange={e => setCustomTarget(e.target.value)}
                />
              )}
            </div>
          )}

          <button
            className="prompt-generate-btn"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            Generate Prompt
          </button>
        </div>
      )}

      {loading && !promptContent && (
        <div className="streaming-indicator">
          <span className="pulse"></span>
          Generating {PROMPT_TYPES.find(t => t.value === promptType)?.label} prompt...
        </div>
      )}

      {error && (
        <div className="prompt-error">{error}</div>
      )}

      {promptContent && (
        <div className="prompt-results">
          <div className="prompt-actions">
            <button className="prompt-action-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
            <button className="prompt-action-btn" onClick={handleDownload}>
              Download .txt
            </button>
            <div className="prompt-view-toggle">
              <button
                className={`prompt-toggle-btn ${viewMode === 'raw' ? 'prompt-toggle-active' : ''}`}
                onClick={() => setViewMode('raw')}
              >
                Raw
              </button>
              <button
                className={`prompt-toggle-btn ${viewMode === 'preview' ? 'prompt-toggle-active' : ''}`}
                onClick={() => setViewMode('preview')}
              >
                Preview
              </button>
            </div>
            {!loading && (
              <button
                className="prompt-action-btn prompt-regenerate-btn"
                onClick={() => {
                  setPromptContent('')
                  setError('')
                }}
              >
                New Prompt
              </button>
            )}
          </div>

          <div className="prompt-output">
            {viewMode === 'raw' ? (
              <pre className="prompt-raw">{promptContent}{loading && <span className="chat-cursor" />}</pre>
            ) : (
              <div className="prompt-preview">
                <MarkdownRenderer content={promptContent} />
                {loading && <span className="chat-cursor" />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptPanel
