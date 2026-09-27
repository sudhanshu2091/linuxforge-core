import { useCallback, useEffect, useState } from "react";
import { getLearnerOverviewFn } from "./overview.functions";
import type { LearnerOverview } from "./overview.server";

export function useLearnerOverview() {
  const [data, setData] = useState<LearnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getLearnerOverviewFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Learner progress could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
