import { Button, Group, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { t } from "../../shared/strings";

// Section page; its feature change fills it.
export function Campaigns() {
  return (
    <Group justify="space-between">
      <Title order={1}>{t("ru", "routes.campaigns")}</Title>
      {/* fde-echo:allow-dead f06-campaign-create link button: component={Link} opens the campaign form */}
      <Button component={Link} to="/campaigns/new">{t("ru", "campaignForm.create")}</Button>
    </Group>
  );
}
