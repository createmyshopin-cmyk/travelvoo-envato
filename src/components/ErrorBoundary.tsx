"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const isConfigError =
        this.state.error?.message?.includes("supabase") ||
        this.state.error?.message?.includes("Invalid API key") ||
        this.state.error?.message?.includes("undefined");

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            background: "hsl(0 0% 98%)",
            color: "hsl(220 20% 20%)",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          {isConfigError && (
            <p style={{ maxWidth: "28rem", textAlign: "center", marginBottom: "1rem", lineHeight: 1.6 }}>
              This may be a configuration issue. In Vercel, set{" "}
              <code style={{ background: "hsl(0 0% 90%)", padding: "0.2em 0.4em", borderRadius: 4 }}>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code style={{ background: "hsl(0 0% 90%)", padding: "0.2em 0.4em", borderRadius: 4 }}>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
              (Next.js — not <code style={{ background: "hsl(0 0% 90%)", padding: "0.2em 0.4em", borderRadius: 4 }}>VITE_*</code>) for Production and Preview, then redeploy.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              background: "hsl(358 82% 55%)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
