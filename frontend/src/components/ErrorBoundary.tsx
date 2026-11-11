import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** What to show instead of the crashed screen. */
  fallback: ReactNode
  children: ReactNode
}

/** Catches rendering errors so a bug shows a message with a way out, never a blank page. */
export class ErrorBoundary extends Component<Props, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('The page crashed while rendering.', error, info.componentStack)
  }

  render(): ReactNode {
    return this.state.crashed ? this.props.fallback : this.props.children
  }
}
