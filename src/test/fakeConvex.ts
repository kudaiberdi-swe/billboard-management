// Fake convex/react for component tests: `vi.mock("convex/react", () => import("../test/fakeConvex"))`.
// A query result is a value, an Error (thrown like the real client) or a function of the call args.
import { useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";

const listeners = new Set<() => void>();
const queries: Record<string, unknown> = {};

export const convex = {
  /** Args of every query call, by function name ("screens:list"). */
  calls: {} as Record<string, unknown[]>,
  mutations: {} as Record<string, (args: unknown) => Promise<unknown>>,
  set(name: string, value: unknown) {
    queries[name] = value;
    listeners.forEach((l) => l());
  },
  reset() {
    for (const k of Object.keys(queries)) delete queries[k];
    convex.calls = {};
    convex.mutations = {};
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useQuery(ref: never, args: unknown) {
  const name = getFunctionName(ref);
  const value = useSyncExternalStore(subscribe, () => queries[name]);
  if (args === "skip") return undefined;
  (convex.calls[name] ??= []).push(args);
  const result = typeof value === "function" ? value(args) : value;
  if (result instanceof Error) throw result;
  return result;
}

export const useMutation = (ref: never) => (args: unknown) => convex.mutations[getFunctionName(ref)](args);
