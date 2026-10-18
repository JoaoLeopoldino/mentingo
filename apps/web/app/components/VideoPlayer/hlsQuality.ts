export const HLS_AUTO_HD_VALUE = "auto-hd";
export const HLS_AUTO_HD_LABEL = "Auto";

export type HlsQualitySelection = typeof HLS_AUTO_HD_VALUE | `fixed:${number}`;

export type HlsQualityLevel = {
  id?: string;
  height?: number;
  width?: number;
  bitrate?: number;
  enabled: boolean;
};

export type HlsQualityLevelList = {
  readonly length: number;
  readonly selectedIndex: number;
  [index: number]: HlsQualityLevel | undefined;
  on: (type: string, listener: () => void) => void;
  off: (type: string, listener: () => void) => void;
};

export type HlsQualityOption = {
  value: HlsQualitySelection;
  label: string;
  height?: number;
};

export const getHlsQualityLevels = (qualityLevels: HlsQualityLevelList | null | undefined) => {
  if (!qualityLevels) return [];

  return Array.from({ length: qualityLevels.length }, (_, index) => qualityLevels[index]).filter(
    (qualityLevel): qualityLevel is HlsQualityLevel => Boolean(qualityLevel),
  );
};

export const getQualityLevelHeight = (qualityLevel: HlsQualityLevel) => {
  const { height } = qualityLevel;
  return typeof height === "number" && Number.isFinite(height) ? height : null;
};

export const getHlsQualityOptions = (qualityLevels: HlsQualityLevel[]): HlsQualityOption[] => {
  const heights = Array.from(
    new Set(
      qualityLevels
        .map(getQualityLevelHeight)
        .filter((height): height is number => height !== null),
    ),
  ).sort((a, b) => b - a);

  if (heights.length < 2) return [];

  return [
    { value: HLS_AUTO_HD_VALUE, label: HLS_AUTO_HD_LABEL },
    ...heights.map((height) => ({
      value: `fixed:${height}` as const,
      label: `${height}p`,
      height,
    })),
  ];
};

export const applyHlsQualitySelection = (
  qualityLevels: HlsQualityLevel[],
  selection: HlsQualitySelection,
) => {
  if (!qualityLevels.length) return;

  if (selection === HLS_AUTO_HD_VALUE) {
    // Keep the persisted selection token, but let the player's ABR choose any rendition.
    // A 720p floor prevents adaptation on weak connections even when lower variants exist.
    qualityLevels.forEach((qualityLevel) => {
      qualityLevel.enabled = true;
    });
    return;
  }

  const fixedHeight = Number(selection.replace("fixed:", ""));

  if (!Number.isFinite(fixedHeight)) {
    qualityLevels.forEach((qualityLevel) => {
      qualityLevel.enabled = true;
    });
    return;
  }

  qualityLevels.forEach((qualityLevel) => {
    qualityLevel.enabled = getQualityLevelHeight(qualityLevel) === fixedHeight;
  });
};

export const getHlsQualityLabel = (selection: HlsQualitySelection, options: HlsQualityOption[]) =>
  options.find((option) => option.value === selection)?.label ?? HLS_AUTO_HD_LABEL;
