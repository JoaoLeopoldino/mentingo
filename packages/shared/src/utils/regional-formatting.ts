/** Corporate display defaults for Angola; never reinterpret stored timestamps. */
export const ANGOLA_FORMATTING = {
  locale: "pt-AO",
  timeZone: "Africa/Luanda",
  currency: "AOA",
} as const;

export const formatAngolaNumber = (value: number): string =>
  new Intl.NumberFormat(ANGOLA_FORMATTING.locale).format(value);

export const formatAngolaPercent = (value: number): string =>
  new Intl.NumberFormat(ANGOLA_FORMATTING.locale, { style: "percent" }).format(value);

/** Receives major units (Kwanza), unlike the commerce price formatter. */
export const formatAngolaCurrency = (value: number): string =>
  new Intl.NumberFormat(ANGOLA_FORMATTING.locale, {
    style: "currency",
    currency: ANGOLA_FORMATTING.currency,
  }).format(value);

export const formatAngolaDateTime = (value: Date | string | number, seconds = false): string =>
  new Intl.DateTimeFormat(ANGOLA_FORMATTING.locale, {
    timeZone: ANGOLA_FORMATTING.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  }).format(new Date(value));
