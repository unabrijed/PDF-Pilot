import { Component, type ErrorInfo, type ReactNode } from "react";
import { Wrench } from "lucide-react";
import { Button } from "./ui/button";

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
      <div className="bg-card mx-auto my-16 max-w-md rounded-2xl border p-9 text-center shadow-sm">
        <Wrench className="text-muted-foreground mx-auto size-9" />
        <h2 className="mt-3 text-xl font-semibold">This tool hit a snag</h2>
        <p className="text-muted-foreground mt-1.5 mb-5 text-sm">Your files are safe and nothing left your browser.</p>
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" onClick={() => this.setState({ err: null })}>Try again</Button>
          <Button variant="ghost" size="sm" onClick={() => location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}
