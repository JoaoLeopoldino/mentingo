import { ApiClient } from "~/api/api-client";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { suspendOfflineSession } from "~/modules/Offline/offline-session";

import { useAuthStore } from "./authStore";

export const authService = {
  logout() {
    suspendOfflineSession();
    useAuthStore.setState({ isLoggedIn: false });
    useCurrentUserStore.setState({ currentUser: undefined });
  },

  async refreshToken() {
    return ApiClient.api.authControllerRefreshTokens();
  },
};
