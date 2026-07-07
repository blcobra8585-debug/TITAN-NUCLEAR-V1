import React, { Component, ComponentType, PropsWithChildren } from "react";
import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";
import { diagError } from "@/lib/diagnosticLog";
// NOTE: reportCrash is loaded via dynamic import() — NOT statically.
// ErrorBoundary is imported statically by _layout.tsx. If we statically
// imported autoHeal here, we'd pull in the full firebase/firestore chain at
// module load time. A crash there would prevent _layout.tsx from loading
// at all, which means the native splash screen would stay stuck forever.

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: { FallbackComponent: ComponentType<ErrorFallbackProps> } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    const context = info.componentStack?.slice(0, 200) ?? "unknown";
    diagError("ErrorBoundary", error);

    // Dynamic import — keeps autoHeal → firebase chain out of the startup path
    import("@/lib/autoHeal")
      .then(({ reportCrash }) => reportCrash(error, context))
      .catch(() => {
        // Last resort: try direct Telegram ping if autoHeal itself failed
        import("@/lib/telegramAlert")
          .then(({ sendTelegramAlert }) =>
            sendTelegramAlert(`React Crash: ${context}`, error.message, "ErrorBoundary"),
          )
          .catch(() => {});
      });

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;
    return this.state.error && FallbackComponent ? (
      <FallbackComponent error={this.state.error} resetError={this.resetError} />
    ) : (
      this.props.children
    );
  }
}
