import { Title } from "@mantine/core";
import { t } from "../../shared/strings";

// Section page; its feature change fills it.
export function Schedule() {
  return <Title order={1}>{t("ru", "routes.schedule")}</Title>;
}
