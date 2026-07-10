// Café opening hours — uniform across the week. Editable from Admin → Settings →
// General → Opening hours (GeneralSettings.openHour / closeHour). These constants
// are the fallback used when the settings are unset.
export const OPEN_HOUR = 9; // 09:00
export const CLOSE_HOUR = 23; // 23:00

export type OpenState = {
  isOpen: boolean;
  /** When the status next flips — used to show "until 11:00 PM" / "opens 9:00 AM". */
  changeAt: Date;
};

// Clamp a stored hour into a usable whole-hour value, falling back when unset/invalid.
function normalizeHour(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(24, Math.max(0, Math.round(value)));
}

export function getOpenState(now: Date, openHour?: number, closeHour?: number): OpenState {
  const open = normalizeHour(openHour, OPEN_HOUR) * 60;
  const close = normalizeHour(closeHour, CLOSE_HOUR) * 60;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = minutes >= open && minutes < close;

  const changeAt = new Date(now);
  changeAt.setSeconds(0, 0);
  if (isOpen) {
    changeAt.setHours(0, close);
  } else {
    changeAt.setHours(0, open);
    // Past closing time → the next opening is tomorrow morning.
    if (minutes >= close) changeAt.setDate(changeAt.getDate() + 1);
  }
  return { isOpen, changeAt };
}
