import { Badge } from "@mantine/core";
import { t } from "../../shared/strings";
import { DEMO_COLOR } from "../theme";

/** The one label for every simulated value (app-shell «Demo label»). */
export function DemoLabel() {
  return (
    <Badge color={DEMO_COLOR} variant="light" tt="none" fw={500}>
      {t("ru", "demo.label")}
    </Badge>
  );
}
