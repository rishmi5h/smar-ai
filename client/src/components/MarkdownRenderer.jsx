import './MarkdownRenderer.css'

function MarkdownRenderer({ content }) {
  if (!content) return null

  // Simple markdown parser
  const parseMarkdown = (text) => {
    let html = text

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.*?)_/g, '<em>$1</em>')

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>')

    // Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>')
    html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>')
    html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>')

    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>')
    html = '<p>' + html + '</p>'

    // Clean up
    html = html.replace(/<p><\/p>/g, '')
    html = html.replace(/<p>(<h[1-6]>)/g, '$1')
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    html = html.replace(/<p>(<pre>)/g, '$1')
    html = html.replace(/(<\/pre>)<\/p>/g, '$1')
    html = html.replace(/<p>(<ul>)/g, '$1')
    html = html.replace(/(<\/ul>)<\/p>/g, '$1')

    return html
  }

  const htmlContent = parseMarkdown(content)

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export default MarkdownRenderer
