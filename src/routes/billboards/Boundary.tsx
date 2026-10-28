// Catches a failed query (useQuery throws) or a failed map module, and renders the fallback instead of the whole page.
import { Component, type ReactNode } from "react";

type Props = { fallback: (error: unknown) => ReactNode; children: ReactNode };

export class Boundary extends Component<Props, { error: unknown }> {
  state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error("unknown") };
  }

  render() {
    return this.state.error === undefined ? this.props.children : this.props.fallback(this.state.error);
  }
}
