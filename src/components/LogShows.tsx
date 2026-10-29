import { Text, Tooltip, VisuallyHidden } from "@mantine/core";
import { t } from "../../shared/strings";
import { formatNumber } from "../format";

/** Shows by the log; a 0 reads as «no simulated log yet», not as a failed campaign. */
export function LogShows({ value }: { value: number }) {
  if (value > 0) return formatNumber(value);
  const note = t("ru", "campaigns.logNotSimulated");
  return (
    <Tooltip label={note}>
      <Text span inherit c="dimmed" tabIndex={0}>
        {formatNumber(0)}
        <VisuallyHidden>{note}</VisuallyHidden>
      </Text>
    </Tooltip>
  );
}
