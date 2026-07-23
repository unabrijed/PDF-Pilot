import { Component, type ErrorInfo, type ReactNode } from "react";

// Catches render throws AND rejected lazy() chunk imports, so one broken route
// (or a stale chunk after a PWA update) shows a card instead of white-screening
// the whole app. App keys this by pathname, so navigating away resets it.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("Tool crashed:", err, info.componentStack);
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-icon">🩹</div>
        <h2>This tool hit a snag</h2>
        <p>Your files are safe and nothing left your browser.</p>
        <div className="crash-actions">
          <button className="primary sm" onClick={() => this.setState({ err: null })}>Try again</button>
          <button className="link" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
