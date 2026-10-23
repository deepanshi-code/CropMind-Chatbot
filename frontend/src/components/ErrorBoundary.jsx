import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught render error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary-page">
          <div className="card error-boundary-card animate-fade-in">
            <div className="error-icon-box">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--accent-red)" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2>Something went wrong · कुछ गड़बड़ हो गई</h2>
            <p>Please reload the page. If it keeps happening, try again later.</p>
            <p lang="hi">कृपया पेज दोबारा लोड करें। अगर ऐसा बार-बार हो, तो थोड़ी देर बाद कोशिश करें।</p>
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              Reload · दोबारा लोड करें
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
