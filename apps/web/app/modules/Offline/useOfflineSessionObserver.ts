import { useEffect } from "react";

import { observeOfflineSession } from "./offline-session";

export function useOfflineSessionObserver() {
  useEffect(() => {
    void window.caches?.delete("assets-cache").catch(() => {});
    return observeOfflineSession();
  }, []);
}
