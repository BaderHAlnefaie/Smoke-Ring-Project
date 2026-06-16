"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR and the first client render, true afterwards.
 *
 * Used to gate UI that depends on client-only state (e.g. a zustand store
 * hydrated from localStorage) so server and client markup match. Implemented
 * with useSyncExternalStore instead of a setState-in-effect, which the React
 * compiler lint rules (correctly) reject.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
