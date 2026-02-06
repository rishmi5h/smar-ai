import { useState, useRef, useEffect } from 'react'
import './ChatPanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const SUGGESTED_QUESTIONS = [
  'How is the project structured?',
  'What are the main entry points?',
  'How does the data flow work?',
  'What dependencies does it use?'
]

function ChatPanel({ repoUrl }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (question) => {
    if (!question.trim() || isStreaming) return

    const userMessage = { role: 'user', content: question.trim() }
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    const assistantMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, question: question.trim(), history })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Chat request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chat_chunk') {
              fullText += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            }
          } catch (e) {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${err.message}`
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Ask about this codebase</h3>
        {messages.length > 0 && (
          <button
            className="chat-clear-btn"
            onClick={() => setMessages([])}
            disabled={isStreaming}
          >
            Clear chat
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="suggestion-btn"
                  onClick={() => sendMessage(q)}
                  disabled={isStreaming}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-message-label">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="chat-message-content">
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <p>{msg.content}</p>
              )}
              {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="chat-cursor" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the code..."
          disabled={isStreaming}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="chat-send-btn"
        >
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatPanel
