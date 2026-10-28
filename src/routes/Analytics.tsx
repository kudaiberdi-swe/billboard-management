import { Title } from "@mantine/core";
import { t } from "../../shared/strings";

// Section page; its feature change fills it.
export function Analytics() {
  return <Title order={1}>{t("ru", "routes.analytics")}</Title>;
}
