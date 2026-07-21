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
            <h2>Something went wrong</h2>
            <p>
              An unexpected render error occurred in the application interface.
            </p>
            <div className="error-details-box">
              <code>{this.state.error?.toString() || "Unknown Component Error"}</code>
            </div>
            <button className="btn-primary" onClick={this.handleReload} style={{ marginTop: "16px" }}>
              Reload Application HUD
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
