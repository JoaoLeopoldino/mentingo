import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useVideoPlaybackRecovery } from "./useVideoPlaybackRecovery";

function nativePlayer() {
  const listeners = new Map<string, Set<() => void>>();
  let time = 0;
  const player = {
    on: (name: string, callback: () => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(callback);
    },
    off: (name: string, callback: () => void) => listeners.get(name)?.delete(callback),
    one: (name: string, callback: () => void) => {
      const once = () => {
        player.off(name, once);
        callback();
      };
      player.on(name, once);
    },
    currentTime: vi.fn((value?: number) => {
      if (value !== undefined) time = value;
      return time;
    }),
    currentSource: () => ({
      src: "https://synthetic.invalid/master.m3u8",
      type: "application/vnd.apple.mpegurl",
    }),
    currentSrc: () => "https://synthetic.invalid/master.m3u8",
    currentType: () => "application/vnd.apple.mpegurl",
    duration: () => 48,
    paused: () => false,
    readyState: () => 2,
    isDisposed: () => false,
    src: vi.fn(),
    load: vi.fn(),
    error: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };
  return {
    player: player as unknown as NonNullable<Parameters<typeof useVideoPlaybackRecovery>[0]>,
    controls: player,
    emit: (name: string) => [...(listeners.get(name) ?? [])].forEach((callback) => callback()),
  };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("native video recovery", () => {
  it("does not cancel recovery for the final timeupdate while media is still buffering", () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result } = renderHook(() => useVideoPlaybackRecovery(p.player, "lesson-a", true));
    act(() => {
      p.emit("waiting");
      vi.advanceTimersByTime(100);
      p.controls.currentTime(7.9);
      p.emit("timeupdate");
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.needsRecovery).toBe(true);
  });
  it("waits for a persistent stall and clears a transient wait on actual playback", () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result } = renderHook(() => useVideoPlaybackRecovery(p.player, "lesson-a", true));
    act(() => {
      p.emit("waiting");
      vi.advanceTimersByTime(7000);
    });
    expect(result.current.needsRecovery).toBe(false);
    act(() => {
      p.emit("playing");
      vi.advanceTimersByTime(9000);
    });
    expect(result.current.needsRecovery).toBe(false);
    act(() => {
      p.emit("waiting");
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.needsRecovery).toBe(true);
  });
  it("reloads the same source once, restores observed position and waits for real playing", async () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result } = renderHook(() => useVideoPlaybackRecovery(p.player, "lesson-a", true));
    act(() => {
      p.controls.currentTime(7.9);
      p.emit("timeupdate");
      p.emit("error");
      result.current.retry();
      result.current.retry();
    });
    expect(p.controls.src).toHaveBeenCalledTimes(1);
    expect(p.controls.src).toHaveBeenCalledWith(p.controls.currentSource());
    expect(result.current.isRetrying).toBe(true);
    await act(async () => {
      p.controls.currentTime(0);
      p.emit("loadedmetadata");
      await Promise.resolve();
    });
    expect(p.controls.currentTime()).toBe(7.9);
    expect(p.controls.play).toHaveBeenCalledTimes(1);
    expect(result.current.needsRecovery).toBe(true);
    act(() => p.emit("playing"));
    expect(result.current.needsRecovery).toBe(false);
  });
  it("keeps recovery available when replay is rejected or metadata times out", async () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result } = renderHook(() => useVideoPlaybackRecovery(p.player, "lesson-a", true));
    p.controls.play.mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      p.emit("error");
      result.current.retry();
      p.emit("loadedmetadata");
      await Promise.resolve();
    });
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.needsRecovery).toBe(true);
    act(() => {
      result.current.retry();
      vi.advanceTimersByTime(12000);
    });
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.needsRecovery).toBe(true);
  });
  it("does not apply old retry listeners or timers to a different source", () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result, rerender } = renderHook(
      ({ source }) => useVideoPlaybackRecovery(p.player, source, true),
      { initialProps: { source: "lesson-a" } },
    );
    act(() => {
      p.controls.currentTime(11);
      p.emit("timeupdate");
      p.emit("error");
      result.current.retry();
    });
    rerender({ source: "lesson-b" });
    act(() => {
      p.controls.currentTime(0);
      p.emit("loadedmetadata");
      vi.advanceTimersByTime(12000);
    });
    expect(p.controls.currentTime()).toBe(0);
    expect(result.current.needsRecovery).toBe(false);
  });
  it("does not attach native recovery to an external playback technology", () => {
    vi.useFakeTimers();
    const p = nativePlayer();
    const { result } = renderHook(() => useVideoPlaybackRecovery(p.player, "youtube", false));
    act(() => {
      p.emit("error");
      result.current.retry();
      vi.advanceTimersByTime(12000);
    });
    expect(result.current.needsRecovery).toBe(false);
    expect(p.controls.src).not.toHaveBeenCalled();
  });
});
