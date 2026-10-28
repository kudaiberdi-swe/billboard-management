// Theme tokens: the one place for colour, type, spacing and size choices (no DESIGN.md yet).
// Operate mode, laptop in a meeting room: light surface, neutral greys, one calm accent for action and
// the current menu item, a warm colour reserved for the demo-data label.
import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: 7,
  defaultRadius: "sm",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headings: { fontWeight: "600" },
  focusRing: "auto",
});

/** Colour of every simulated-value label (PRODUCT.md principle 1). */
export const DEMO_COLOR = "orange";
/** Left menu width, px. */
export const NAVBAR_WIDTH = 248;
/** Password form width, px. */
export const LOGIN_WIDTH = 360;
/** Height of a chart plot, px. */
export const CHART_HEIGHT = 240;
/** Date shown to the user (dayjs format). */
export const DATE_FORMAT = "DD.MM.YYYY";
/** Numbers are shown with Russian digit grouping and decimal comma. */
export const NUMBER_LOCALE = "ru-RU";
/** Screen status badge colours (online / offline). */
export const SCREEN_STATUS_COLOR = { online: "teal", offline: "red" } as const;
/** Campaign status badge colours. */
export const CAMPAIGN_STATUS_COLOR = { planned: "blue", active: "teal", finished: "gray" } as const;
/** Map of screens height, px. */
export const MAP_HEIGHT = 360;
/** Screen image in a list row, px wide. */
export const THUMB_WIDTH = 72;
/** Screen image on the billboard card, px wide. */
export const CARD_IMAGE_WIDTH = 320;
/** Hour column of the card schedule, px wide. */
export const HOUR_COLUMN_WIDTH = 112;
