import { Title } from "@mantine/core";
import { t } from "../../shared/strings";

// Section page; its feature change fills it.
export function Reports() {
  return <Title order={1}>{t("ru", "routes.reports")}</Title>;
}
