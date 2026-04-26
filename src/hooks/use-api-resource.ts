'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiProblem } from '@/types/api';

export function useApiResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loader();
      if (requestId === requestIdRef.current) setData(result);
    } catch (err) {
      const problem = err as ApiProblem;
      if (requestId === requestIdRef.current) {
        setError(problem?.message ?? 'Unable to load data.');
        setData(null);
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, isLoading, reload };
}
