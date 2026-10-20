import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useLocation,
} from "@remix-run/react";
import { Suspense } from "react";

import { version } from "~/../version.json";

import { DemoEnvironmentNotice } from "./components/DemoEnvironmentNotice";
import { PlatformFavicon } from "./components/PlatformFavicon";
import { Toaster } from "./components/ui/toaster";
import { useNavigationTracker } from "./hooks/useNavigationTracker";
import css from "./index.css?url";
import CustomErrorBoundary from "./modules/common/ErrorBoundary/ErrorBoundary";
import Loader from "./modules/common/Loader/Loader";
import { Providers } from "./modules/Global/Providers";
import { ThemeWrapper } from "./modules/Global/ThemeWrapper";
import { OfflineProviders } from "./modules/Offline/OfflineProviders";
import { useOfflineSessionObserver } from "./modules/Offline/useOfflineSessionObserver";
import { useOfflineSynchronization } from "./modules/Offline/useOfflineSynchronization";

import type { LinksFunction } from "@remix-run/node";

export const links: LinksFunction = () => {
  return [
    { rel: "icon", href: "/utu-signet.svg", type: "image/svg+xml" },
    { rel: "shortcut icon", href: "/utu-signet.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", href: "/utu-signet.svg" },
    { rel: "manifest", href: "/api/settings/manifest.webmanifest" },
    { rel: "stylesheet", href: css },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="generator" content={`Utu Lab LMS ${version}`} />
        {import.meta.env.VITE_DEMONSTRATION_MODE === "true" && (
          <meta name="robots" content="noindex,nofollow,noarchive" />
        )}
        <Meta />
        <Links />
      </head>
      <body>
        {import.meta.env.VITE_DEMONSTRATION_MODE === "true" && <DemoEnvironmentNotice />}
        {children}
        <ScrollRestoration />
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}

export default function Root() {
  useNavigationTracker();
  useOfflineSessionObserver();
  useOfflineSynchronization();
  const { pathname } = useLocation();
  if (pathname === "/offline-learning") {
    return (
      <OfflineProviders>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </OfflineProviders>
    );
  }

  return (
    <Providers>
      <ThemeWrapper>
        <PlatformFavicon />
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </ThemeWrapper>
    </Providers>
  );
}

export function HydrateFallback() {
  return <div />;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <CustomErrorBoundary stack={error.data} message={error.statusText} />;
  } else if (error instanceof Error) {
    return <CustomErrorBoundary stack={error.stack} message={error.message} />;
  } else {
    return <CustomErrorBoundary />;
  }
}
