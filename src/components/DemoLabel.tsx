import { Badge } from "@mantine/core";
import { t } from "../../shared/strings";
import { DEMO_COLOR, DEMO_TEXT } from "../theme";

/** The one label for every simulated value (app-shell «Demo label»). The text never truncates: it is the claim. */
export function DemoLabel() {
  return (
    <Badge
      color={DEMO_COLOR}
      variant="light"
      size="md"
      tt="none"
      fw={500}
      c={DEMO_TEXT}
      style={{ flexShrink: 0 }}
      styles={{ label: { overflow: "visible", textOverflow: "clip" } }}
    >
      {t("ru", "demo.label")}
    </Badge>
  );
}
