"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { graphScopes } from "@/lib/msal-config";

// ── Token acquisition ────────────────────────────────────────────────

function useUserToken() {
  const { instance } = useMsal();

  const getToken = useCallback(async () => {
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: graphScopes.search,
      account,
    });
    return response.accessToken;
  }, [instance]);

  return { getToken };
}

// ── Saved Queries ────────────────────────────────────────────────────

export interface SavedQueryItem {
  id: string;
  title: string;
  query: string;
  filters?: Record<string, unknown>;
  createdAt: string;
}

export function useSavedQueries() {
  const { getToken } = useUserToken();
  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchQueries = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/saved-queries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && mounted.current) {
        setQueries(await response.json());
      }
    } catch {
      // Best-effort
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchQueries(); }, [fetchQueries]);

  const saveQuery = useCallback(async (title: string, query: string, filters?: Record<string, unknown>) => {
    try {
      const token = await getToken();
      const response = await fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, query, filters }),
      });
      if (response.ok) {
        const created = await response.json();
        setQueries((prev) => [created, ...prev]);
        return true;
      }
    } catch { /* best-effort */ }
    return false;
  }, [getToken]);

  const deleteQuery = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      await fetch("/api/saved-queries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      setQueries((prev) => prev.filter((q) => q.id !== id));
    } catch { /* best-effort */ }
  }, [getToken]);

  return { queries, loading, saveQuery, deleteQuery, refetch: fetchQueries };
}

// ── Favorites ────────────────────────────────────────────────────────

export interface FavoriteItem {
  id: string;
  documentUrl: string;
  title: string;
  siteName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function useFavorites() {
  const { getToken } = useUserToken();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && mounted.current) {
        setFavorites(await response.json());
      }
    } catch {
      // Best-effort
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (url: string, title: string, siteName?: string) => {
    const existing = favorites.find((f) => f.documentUrl === url);
    try {
      const token = await getToken();
      if (existing) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ documentUrl: url }),
        });
        setFavorites((prev) => prev.filter((f) => f.documentUrl !== url));
      } else {
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ documentUrl: url, title, siteName }),
        });
        if (response.ok) {
          const created = await response.json();
          setFavorites((prev) => [created, ...prev]);
        }
      }
    } catch { /* best-effort */ }
  }, [getToken, favorites]);

  return { favorites, loading, toggleFavorite, refetch: fetchFavorites };
}

// ── Recent Searches ──────────────────────────────────────────────────

export interface RecentSearchItem {
  id: string;
  query: string;
  filters?: Record<string, unknown>;
  resultCount: number;
  createdAt: string;
}

export function useRecentSearches() {
  const { getToken } = useUserToken();
  const [searches, setSearches] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchSearches = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/recent-searches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && mounted.current) {
        setSearches(await response.json());
      }
    } catch {
      // Best-effort
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchSearches(); }, [fetchSearches]);

  const recordSearch = useCallback(async (query: string, resultCount: number, filters?: Record<string, unknown>) => {
    try {
      const token = await getToken();
      fetch("/api/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, resultCount, filters }),
      }).catch(() => {});
      // Optimistically add to local state
      setSearches((prev) => {
        const filtered = prev.filter((s) => s.query !== query);
        return [{ id: crypto.randomUUID(), query, resultCount, createdAt: new Date().toISOString() }, ...filtered].slice(0, 20);
      });
    } catch { /* fire-and-forget */ }
  }, [getToken]);

  return { searches, loading, recordSearch, refetch: fetchSearches };
}
