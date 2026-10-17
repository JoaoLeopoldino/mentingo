import { PERMISSIONS } from "@repo/shared";

import { useAuthStore } from "~/modules/Auth/authStore";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";

import { offlineStorage } from "./offline-storage";

export function getOfflineOwner() {
  const user = useCurrentUserStore.getState().currentUser;
  if (
    typeof window === "undefined" ||
    !useAuthStore.getState().isLoggedIn ||
    !user ||
    user.isSupportMode ||
    !user.permissions?.includes(PERMISSIONS.USER_READ_SELF)
  )
    return undefined;
  return `${window.location.origin}:${user.id}`;
}
let observedOwner: string | undefined;
export function observeOfflineSession() {
  const update = () => {
    const owner = getOfflineOwner();
    if (observedOwner && observedOwner !== owner)
      void offlineStorage.purgeOwner(observedOwner).catch(() => {});
    observedOwner = owner;
  };
  update();
  const unsubscribeAuth = useAuthStore.subscribe(update);
  const unsubscribeUser = useCurrentUserStore.subscribe(update);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "auth-storage" && event.key !== "current-user-storage") return;
    let auth;
    let user;
    try {
      auth = JSON.parse(localStorage.getItem("auth-storage") ?? "null");
      user = JSON.parse(localStorage.getItem("current-user-storage") ?? "null");
    } catch {
      useAuthStore.setState({ isLoggedIn: false });
      useCurrentUserStore.setState({ currentUser: undefined });
      return;
    }
    if (
      !auth?.state?.isLoggedIn ||
      user?.state?.currentUser?.id !== useCurrentUserStore.getState().currentUser?.id
    ) {
      useAuthStore.setState({ isLoggedIn: false });
      useCurrentUserStore.setState({ currentUser: undefined });
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribeAuth();
    unsubscribeUser();
    window.removeEventListener("storage", onStorage);
  };
}
