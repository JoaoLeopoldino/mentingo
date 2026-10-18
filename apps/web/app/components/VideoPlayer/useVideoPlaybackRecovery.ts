import { useCallback, useEffect, useRef, useState } from "react";

import type videojs from "video.js";

/** Explicit recovery for native media; reload the same source and restore the observed position. */
export function useVideoPlaybackRecovery(
  player: ReturnType<typeof videojs> | null,
  sourceKey: string,
  enabled: boolean,
) {
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setNeedsRecovery(false);
    setIsRetrying(false);
    retryRef.current = null;
    if (!player || !enabled) return;

    let active = true;
    let retrying = false;
    let position = 0;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let restore: (() => void) | undefined;
    const clearStall = () => {
      clearTimeout(stallTimer);
      stallTimer = undefined;
    };
    const clearRetry = () => {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    };
    const detachRestore = () => {
      if (restore) player.off("loadedmetadata", restore);
      restore = undefined;
    };
    const showFailure = () => {
      if (!active) return;
      clearStall();
      clearRetry();
      detachRestore();
      retrying = false;
      setIsRetrying(false);
      setNeedsRecovery(true);
    };
    const onWaiting = () => {
      if (stallTimer || player.paused()) return;
      stallTimer = setTimeout(() => {
        if (active) setNeedsRecovery(true);
      }, 8000);
    };
    const onTimeUpdate = () => {
      const current = player.currentTime();
      if (typeof current !== "number" || !Number.isFinite(current) || current < 0) return;
      // A final timeupdate can follow "waiting" while readyState is still HAVE_CURRENT_DATA.
      if (current !== position && player.readyState() >= 3) clearStall();
      position = current;
    };
    const onPlaying = () => {
      clearStall();
      clearRetry();
      retrying = false;
      if (active) {
        setNeedsRecovery(false);
        setIsRetrying(false);
      }
    };
    const onPause = () => clearStall();
    const onEnded = () => {
      onPlaying();
      position = 0;
    };

    retryRef.current = () => {
      if (!active || retrying || player.isDisposed()) return;
      const source = { src: player.currentSrc(), type: player.currentType() };
      if (!source?.src) {
        showFailure();
        return;
      }
      const current = player.currentTime();
      if (typeof current === "number" && Number.isFinite(current) && current > 0)
        position = current;
      const resumeAt = position;
      retrying = true;
      clearStall();
      clearRetry();
      detachRestore();
      setIsRetrying(true);
      restore = () => {
        if (!active) return;
        restore = undefined;
        const duration = player.duration();
        let boundedPosition = resumeAt;
        if (typeof duration === "number" && Number.isFinite(duration) && duration > 0)
          boundedPosition = Math.min(resumeAt, Math.max(0, duration - 0.1));
        player.currentTime(boundedPosition);
        void player.play()?.catch(showFailure);
      };
      player.one("loadedmetadata", restore);
      retryTimer = setTimeout(showFailure, 12000);
      try {
        player.error(undefined);
        player.src(source);
        player.load();
      } catch {
        showFailure();
      }
    };
    player.on("waiting", onWaiting);
    player.on("stalled", onWaiting);
    player.on("error", showFailure);
    player.on("timeupdate", onTimeUpdate);
    player.on("playing", onPlaying);
    player.on("pause", onPause);
    player.on("ended", onEnded);
    return () => {
      active = false;
      retryRef.current = null;
      clearStall();
      clearRetry();
      detachRestore();
      player.off("waiting", onWaiting);
      player.off("stalled", onWaiting);
      player.off("error", showFailure);
      player.off("timeupdate", onTimeUpdate);
      player.off("playing", onPlaying);
      player.off("pause", onPause);
      player.off("ended", onEnded);
    };
  }, [player, sourceKey, enabled]);

  const retry = useCallback(() => retryRef.current?.(), []);
  return { needsRecovery, isRetrying, retry };
}
