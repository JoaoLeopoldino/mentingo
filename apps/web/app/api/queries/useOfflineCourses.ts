import { useQuery } from "@tanstack/react-query";

import { offlineStorage } from "~/modules/Offline/offline-storage";

import { OFFLINE_COURSES_QUERY_KEY } from "../mutations/useDownloadOfflineCourse";

export function useOfflineCourses(owner: string | undefined) {
  return useQuery({
    queryKey: [...OFFLINE_COURSES_QUERY_KEY, owner],
    queryFn: () => (owner ? offlineStorage.list(owner) : []),
    networkMode: "always",
    retry: false,
    staleTime: 0,
    refetchInterval: 5000,
  });
}
