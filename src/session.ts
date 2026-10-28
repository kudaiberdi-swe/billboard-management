// Demo session transport (design D3): one sessionId per browser, added to every guarded call.
import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs, FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import { errorCode, errorText } from "./errors";

const KEY = "billboard.sessionId";

export function sessionId(): string {
  let id = localStorage.getItem(KEY);
  if (id?.length !== 36) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Gate listens: any guarded call that fails with UNAUTHENTICATED returns the app to the password screen.
const listeners = new Set<() => void>();
export function onUnauthenticated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function reportUnauthenticated(): void {
  for (const listener of listeners) listener();
}

type Guarded<F extends FunctionReference<"query" | "mutation">> = Omit<FunctionArgs<F>, "sessionId">;

export function useGuardedQuery<Q extends FunctionReference<"query">>(
  fn: Q,
  args: Guarded<Q> | "skip",
): FunctionReturnType<Q> | undefined {
  const full = args === "skip" ? "skip" : { ...args, sessionId: sessionId() };
  return useQuery(fn, ...([full] as unknown as OptionalRestArgs<Q>));
}

export function useGuardedMutation<M extends FunctionReference<"mutation">>(fn: M) {
  const run = useMutation(fn);
  return useCallback(
    async (args: Guarded<M>): Promise<FunctionReturnType<M>> => {
      try {
        return await run(...([{ ...args, sessionId: sessionId() }] as unknown as OptionalRestArgs<M>));
      } catch (error) {
        if (errorCode(error) === "UNAUTHENTICATED") reportUnauthenticated();
        throw error;
      }
    },
    [run],
  );
}

/** Runs a write from a form or button: a busy flag and the Russian text of the last failure. */
export function useSubmit<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(...args: A) {
    setBusy(true);
    setError(undefined);
    try {
      await fn(...args);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return { submit, busy, error };
}
