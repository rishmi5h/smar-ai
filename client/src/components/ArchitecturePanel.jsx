import { useState, useEffect, useRef, useCallback } from 'react'
import mermaid from 'mermaid'
import './ArchitecturePanel.css'
import MarkdownRenderer from './MarkdownRenderer'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#4f7cff',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#4f7cff',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#4f7cff',
    clusterBkg: '#1a2332',
    clusterBorder: '#2a3850',
    titleColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b'
  },
  flowchart: {
    curve: 'basis',
    padding: 15
  }
})

function ArchitecturePanel({ repoUrl }) {
  const [loading, setLoading] = useState(false)
  const [mermaidDSL, setMermaidDSL] = useState('')
  const [graph, setGraph] = useState(null)
  const [analysis, setAnalysis] = useState('')
  const [svgContent, setSvgContent] = useState('')
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const diagramRef = useRef(null)

  const renderDiagram = useCallback(async (dsl) => {
    if (!dsl || !diagramRef.current) return
    try {
      const { svg } = await mermaid.render('arch-diagram-' + Date.now(), dsl)
      setSvgContent(svg)
    } catch (err) {
      console.error('Mermaid render error:', err)
      setSvgContent('')
    }
  }, [])

  useEffect(() => {
    if (mermaidDSL) {
      renderDiagram(mermaidDSL)
    }
  }, [mermaidDSL, renderDiagram])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setAnalysis('')
    setGraph(null)
    setMermaidDSL('')
    setSvgContent('')
    setZoom(1)

    try {
      const response = await fetch(`${API_BASE_URL}/architecture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate architecture')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let analysisText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'metadata') {
              setGraph(data.graph)
              setMermaidDSL(data.mermaidDSL)
            } else if (data.type === 'analysis_chunk') {
              analysisText += data.text
              setAnalysis(analysisText)
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

  const handleDownloadSVG = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'architecture-diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="architecture-panel">
      {!graph && !loading && (
        <div className="arch-empty">
          <p>Generate an architecture diagram to visualize how files in this repository depend on each other.</p>
          <button className="arch-generate-btn" onClick={handleGenerate} disabled={loading}>
            Generate Architecture Diagram
          </button>
        </div>
      )}

      {loading && !graph && (
        <div className="streaming-indicator">
          <span className="pulse"></span>
          Analyzing repository structure...
        </div>
      )}

      {error && (
        <div className="arch-error">{error}</div>
      )}

      {graph && (
        <div className="arch-results">
          {/* Diagram */}
          <div className="arch-diagram-section">
            <div className="arch-diagram-header">
              <h4>Dependency Graph</h4>
              <div className="arch-diagram-controls">
                <button className="arch-ctrl-btn" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}>−</button>
                <span className="arch-zoom-label">{Math.round(zoom * 100)}%</span>
                <button className="arch-ctrl-btn" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>+</button>
                <button className="arch-ctrl-btn" onClick={() => setZoom(1)}>Reset</button>
                {svgContent && (
                  <button className="arch-ctrl-btn" onClick={handleDownloadSVG}>Download SVG</button>
                )}
              </div>
            </div>
            <div className="arch-diagram-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
              <div ref={diagramRef} dangerouslySetInnerHTML={{ __html: svgContent }} />
            </div>
          </div>

          {/* Stats */}
          <div className="arch-stats">
            <span className="arch-stat">{graph.nodes.length} files</span>
            <span className="arch-stat">{graph.edges.length} dependencies</span>
            <span className="arch-stat">{graph.externalDeps.length} external packages</span>
          </div>

          {/* External Dependencies */}
          {graph.externalDeps.length > 0 && (
            <div className="arch-external">
              <h4>External Dependencies</h4>
              <div className="arch-dep-tags">
                {graph.externalDeps.map(dep => (
                  <span key={dep} className="arch-dep-tag">{dep}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="arch-analysis">
            <h4>Architecture Analysis</h4>
            {loading && !analysis && (
              <div className="streaming-indicator">
                <span className="pulse"></span>
                Analyzing architecture...
              </div>
            )}
            {analysis && <MarkdownRenderer content={analysis} />}
            {loading && analysis && <span className="chat-cursor" />}
          </div>
        </div>
      )}
    </div>
  )
}

export default ArchitecturePanel
