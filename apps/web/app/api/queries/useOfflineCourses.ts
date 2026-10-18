import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { offlineStorage } from "~/modules/Offline/offline-storage";

import { OFFLINE_COURSES_QUERY_KEY } from "../mutations/useDownloadOfflineCourse";
import { queryClient } from "../queryClient";

export function useOfflineCourses(owner: string | undefined) {
  const query = useQuery({
    queryKey: [...OFFLINE_COURSES_QUERY_KEY, owner],
    queryFn: () => (owner ? offlineStorage.list(owner) : []),
    networkMode: "always",
    retry: false,
    staleTime: 0,
  });
  useEffect(() => {
    if (!query.data?.length) return;
    const nextExpiry = Math.min(...query.data.map((course) => course.expiresAt));
    const timer = window.setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: OFFLINE_COURSES_QUERY_KEY }),
      Math.max(0, nextExpiry - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [query.data]);
  return query;
}
