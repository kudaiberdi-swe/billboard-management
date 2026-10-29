// Theme tokens: the one place for colour, type, spacing and size choices (no DESIGN.md yet).
// Operate mode, laptop in a meeting room: light surface, neutral greys, one calm accent for action and
// the current menu item, a warm colour reserved for the demo-data notice and the report disclaimer.
import { createTheme, NavLink, type CSSVariablesResolver } from "@mantine/core";

/** Text of the global demo-data notice: a dark orange, 6.4:1 on the white page (WCAG AA). */
export const DEMO_TEXT = "#a63c06";

export const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: 7,
  defaultRadius: "sm",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  headings: { fontWeight: "600" },
  focusRing: "auto",
  components: {
    // the current menu item: darkest accent text on its light tint (AA)
    NavLink: NavLink.extend({ vars: () => ({ root: { "--nl-color": "var(--mantine-color-indigo-9)" }, children: {} }) }),
  },
});

/** Light badge tints whose shade-9 text falls under 4.5:1 on tint 1; tint 0 brings them over it. */
const PALE_TINTS = ["teal", "red"] as const;

/** Contrast fixes on top of Mantine's defaults (axe: 0 serious). Passed to MantineProvider. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": "var(--mantine-color-gray-7)",
    ...Object.fromEntries(PALE_TINTS.map((c) => [`--mantine-color-${c}-light`, `var(--mantine-color-${c}-0)`])),
  },
  dark: {},
});

/** Colour of the report disclaimer banner (PRODUCT.md principle 1). */
export const DEMO_COLOR = "orange";
/** Left menu width, px. */
export const NAVBAR_WIDTH = 248;
/** Password form width, px. */
export const LOGIN_WIDTH = 360;
/** Height of a chart plot, px. */
export const CHART_HEIGHT = 240;
/** Date shown to the user (dayjs format). */
export const DATE_FORMAT = "DD.MM.YYYY";
/** Date under a chart x-axis tick (dayjs format); the full date stays in the table view. */
export const AXIS_DATE_FORMAT = "DD.MM";
/** Numbers are shown with Russian digit grouping and decimal comma. */
export const NUMBER_LOCALE = "ru-RU";
/** Screen status badge colours (online / offline). */
export const SCREEN_STATUS_COLOR = { online: "teal", offline: "red" } as const;
/** Text colour of a count that needs attention (offline screens): AA on white. */
export const ALERT_TEXT = "red.9";
/** Campaign status badge colours. */
export const CAMPAIGN_STATUS_COLOR = { planned: "blue", active: "teal", finished: "gray" } as const;
/** Map of screens height, px. */
export const MAP_HEIGHT = 360;
/** Screen image in a list row, px wide. */
export const THUMB_WIDTH = 48;
/** Address column of the screen list: one line, px wide. */
export const ADDRESS_WIDTH = 240;
/** Status column: room for the offline status on one line, px. */
export const STATUS_COLUMN_WIDTH = 96;
/** Screen image on the billboard card, px wide. */
export const CARD_IMAGE_WIDTH = 320;
/** Hour column of the card schedule, px wide. */
export const HOUR_COLUMN_WIDTH = 112;
/** Campaign name in a schedule hour row: one line, px wide at most. */
export const SCHEDULE_NAME_WIDTH = 160;
/** Term column of a detail list (campaign card), px. */
export const TERM_WIDTH = 200;
/** Filter inputs of the reports section, px. */
export const FILTER_WIDTH = 240;
/** Result or refusal note under a header action (campaign card), px wide at most. */
export const ACTION_NOTE_WIDTH = 360;
/** Audience chart series: people in a light step of the accent, looks in its full shade. */
export const AUDIENCE_SERIES_COLOR = { people: "indigo.3", looks: "indigo.7" } as const;
/** Hour axis of the audience chart: a label every 2 hours (recharts interval = ticks skipped). */
export const HOUR_AXIS_INTERVAL = 1;
/** Day axis of a chart: at most this many date labels, at a regular step. */
export const DAY_AXIS_TICKS = 16;
/** Name column of the campaign list: a usual name stays on one line, a longer one wraps, px. */
export const NAME_COLUMN_WIDTH = 180;
/** A wide table keeps at least this width, px; a narrower window scrolls the table, not the page. */
export const TABLE_MIN_WIDTH = 960;
/** Frame of the selected choice card: the accent, not colour alone (the radio role carries aria-checked). */
export const SELECTED_OUTLINE = { outline: "2px solid var(--mantine-primary-color-filled)", outlineOffset: -1 } as const;
