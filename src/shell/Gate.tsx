// Session gate (design D9): no valid session -> /login; UNAUTHENTICATED from any call -> /login.
import { Component, useEffect, useState, type ReactNode } from "react";
import { Alert, Center, Loader } from "@mantine/core";
import { useQuery } from "convex/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { onUnauthenticated, reportUnauthenticated, sessionId } from "../session";
import { AppShell } from "./AppShell";
import { PasswordScreen } from "./PasswordScreen";

export function Gate() {
  const status = useQuery(api.demo.sessionStatus, { sessionId: sessionId() });
  // sessionStatus is not re-run when time passes; an UNAUTHENTICATED call is the expiry signal.
  const [expired, setExpired] = useState(false);
  useEffect(() => onUnauthenticated(() => setExpired(true)), []);

  if (status === undefined) {
    return (
      <Center mih="100vh" aria-busy="true">
        <Loader aria-label={t("ru", "common.loading")} />
      </Center>
    );
  }
  const signedIn = status.valid && !expired;
  return (
    <Routes>
      <Route
        path="/login"
        element={signedIn ? <Navigate to="/" replace /> : <PasswordScreen onSignedIn={() => setExpired(false)} />}
      />
      <Route
        path="*"
        element={
          signedIn ? (
            <CallErrors>
              <AppShell />
            </CallErrors>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

/** A guarded query throws during render: UNAUTHENTICATED goes to the password screen, other codes show their text. */
class CallErrors extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    if (errorCode(error) === "UNAUTHENTICATED") reportUnauthenticated();
  }
  render() {
    if (this.state.error === undefined) return this.props.children;
    if (errorCode(this.state.error) === "UNAUTHENTICATED") return null;
    return (
      <Center mih="100vh">
        <Alert color="red" role="alert">
          {errorText(this.state.error)}
        </Alert>
      </Center>
    );
  }
}
