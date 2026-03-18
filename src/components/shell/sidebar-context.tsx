"use client";

import { createContext, useContext, useCallback, useRef, type ReactNode } from "react";

interface SidebarContextValue {
  executeQuery: (query: string, filters?: Record<string, unknown>) => void;
  registerExecuteQuery: (fn: (query: string, filters?: Record<string, unknown>) => void) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  executeQuery: () => {},
  registerExecuteQuery: () => {},
});

export function useSidebarContext() {
  return useContext(SidebarContext);
}

export function SidebarContextProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<((query: string, filters?: Record<string, unknown>) => void) | null>(null);

  const registerExecuteQuery = useCallback(
    (fn: (query: string, filters?: Record<string, unknown>) => void) => {
      handlerRef.current = fn;
    },
    []
  );

  const executeQuery = useCallback(
    (query: string, filters?: Record<string, unknown>) => {
      handlerRef.current?.(query, filters);
    },
    []
  );

  return (
    <SidebarContext.Provider value={{ executeQuery, registerExecuteQuery }}>
      {children}
    </SidebarContext.Provider>
  );
}
