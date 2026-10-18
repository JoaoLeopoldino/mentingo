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
const suspendedKey = "mentingo:offline-suspended-owner";
export function suspendOfflineSession() {
  const owner = getOfflineOwner();
  try {
    if (owner) localStorage.setItem(suspendedKey, owner);
  } catch {
    /* Auth can still lock the interface when browser storage is unavailable. */
  }
}
export function clearOfflineSuspension() {
  try {
    localStorage.removeItem(suspendedKey);
  } catch {
    /* Never block sign-out. */
  }
}
let observedOwner: string | undefined;
export function observeOfflineSession() {
  const update = () => {
    const owner = getOfflineOwner();
    let suspended: string | null = null;
    try {
      suspended = localStorage.getItem(suspendedKey);
    } catch {
      /* Fail closed; retained attempts stay partitioned by owner. */
    }
    // Expired authentication locks local content, preserving answers for the same account.
    if (!owner && observedOwner === suspended) return;
    const previous = observedOwner ?? suspended ?? undefined;
    if (previous && previous !== owner)
      void offlineStorage.courses
        .where("owner")
        .equals(previous)
        .delete()
        .catch(() => {});
    if (owner && suspended) clearOfflineSuspension();
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
