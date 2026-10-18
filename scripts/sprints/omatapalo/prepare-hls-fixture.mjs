/** Locally generated moving test pattern; no third-party media or external transcoding service. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = path.join(root, `.local/sprint/hls-${Date.now()}`);
await mkdir(directory); // Exclusive fixture directory: never overwrite previous samples.
const startedAt = new Date().toISOString();
const started = Date.now();
const duration = 48;
const levels = [
  { width: 256, height: 144, bitrate: 64000 },
  { width: 426, height: 240, bitrate: 128000 },
  { width: 640, height: 360, bitrate: 256000 },
  { width: 1280, height: 720, bitrate: 900000 },
];
const master = ["#EXTM3U", "#EXT-X-VERSION:3"];
const files = {};
const image = process.env.SPRINT_FFMPEG_IMAGE;
if (image && !/^mwader\/static-ffmpeg:(?:\d+\.){2}\d+(?:-\d+)?$/.test(image))
  throw new Error("Use an explicitly versioned FFmpeg image");
const encoder = image
  ? JSON.parse(
      execFileSync("docker", ["image", "inspect", "--format", "{{json .RepoDigests}}", image], {
        encoding: "utf8",
      }),
    )
  : "local ffmpeg";
for (const level of levels) {
  const folder = path.join(directory, String(level.height));
  await mkdir(folder);
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${level.width}x${level.height}:rate=15:duration=${duration}`,
    "-an",
    "-c:v",
    "libx264",
    "-threads",
    "2",
    "-preset",
    "veryfast",
    "-profile:v",
    "baseline",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "30",
    "-keyint_min",
    "30",
    "-sc_threshold",
    "0",
    "-b:v",
    String(level.bitrate),
    "-minrate",
    String(level.bitrate),
    "-maxrate",
    String(level.bitrate),
    "-bufsize",
    String(level.bitrate * 2),
    "-x264-params",
    "nal-hrd=cbr:force-cfr=1",
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(folder, "segment-%03d.ts"),
    path.join(folder, "index.m3u8"),
  ];
  if (image) {
    execFileSync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--cpus",
        "2",
        "--memory",
        "512m",
        "--user",
        `${process.getuid()}:${process.getgid()}`,
        "--mount",
        `type=bind,src=${directory},dst=/data`,
        image,
        ...args.map((arg) => arg.replaceAll(directory, "/data")),
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } else execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  let totalBytes = 0,
    maxSegmentBytes = 0;
  for (const name of await readdir(folder)) {
    const data = await readFile(path.join(folder, name));
    files[`${level.height}/${name}`] = {
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    };
    if (name.endsWith(".ts")) {
      totalBytes += data.length;
      maxSegmentBytes = Math.max(maxSegmentBytes, data.length);
    }
  }
  const averageBandwidth = Math.ceil((totalBytes * 8) / duration);
  const bandwidth = Math.ceil(((maxSegmentBytes * 8) / 2) * 1.05);
  master.push(
    `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},AVERAGE-BANDWIDTH=${averageBandwidth},RESOLUTION=${level.width}x${level.height},FRAME-RATE=15,CODECS="avc1.42c01f"`,
    `${level.height}/index.m3u8`,
  );
  Object.assign(level, { bytes: totalBytes, averageBandwidth, bandwidth });
}
await writeFile(path.join(directory, "master.m3u8"), master.join("\n") + "\n");
const report = {
  source: "ffmpeg lavfi testsrc2 synthetic pattern, generated locally; no audio",
  encoder,
  startedAt,
  finishedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  directory,
  durationSeconds: duration,
  levels,
  files,
};
await writeFile(path.join(root, ".local/sprint/hls-fixture.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ directory, elapsedMs: report.elapsedMs, duration, levels }));
