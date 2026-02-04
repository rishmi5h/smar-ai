import './LoadingSpinner.css'

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <h2>Analyzing Repository...</h2>
      <p>Our AI is reading your code and preparing a comprehensive analysis</p>
      <div className="progress-steps">
        <div className="step active">
          <span className="step-number">1</span>
          <span className="step-label">Fetching Repository</span>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <span className="step-label">Parsing Code</span>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <span className="step-label">Generating Analysis</span>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
