"use client";

import { useAdminFetch } from "@/hooks/use-admin-api";
import { useCallback } from "react";

interface FlagEntry {
  name: string;
  enabled: boolean;
  description: string;
}

interface FlagsResponse {
  flags: FlagEntry[];
}

export function useFeatureFlags() {
  const { data, loading, error, refetch } = useAdminFetch<FlagsResponse>(
    "/api/admin/feature-flags"
  );

  const isEnabled = useCallback(
    (name: string) => data?.flags.find((f) => f.name === name)?.enabled ?? false,
    [data]
  );

  return {
    flags: data?.flags ?? [],
    loading,
    error,
    isEnabled,
    refetch,
  };
}
