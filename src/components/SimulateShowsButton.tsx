import { useState } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { t } from "../../shared/strings";
import { formatDate } from "../format";
import { useGuardedMutation, useSubmit } from "../session";
import { ACTION_NOTE_WIDTH } from "../theme";

/** The simulate-shows button of the campaign card (f10-simulate-shows); the card re-reads the log reactively. */
export function SimulateShowsButton({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const simulate = useGuardedMutation(api.showLog.simulate);
  const [done, setDone] = useState<{ from: string; to: string }>();
  const { submit, busy, error } = useSubmit(async () => {
    setDone(undefined);
    setDone(await simulate({ campaignId }));
  });
  // A campaign before its start date is an expected state, not a failure: say why (calm tone) and keep the button off.
  const notStarted = error === t("ru", "errors.CAMPAIGN_NOT_STARTED");
  return (
    <Stack gap="xs" align="flex-end" maw={ACTION_NOTE_WIDTH}>
      <Button onClick={() => submit()} loading={busy} disabled={notStarted}>
        {t("ru", "simulate.button")}
      </Button>
      {done && (
        <Text role="status" size="sm">
          {t("ru", "simulate.done", { from: formatDate(done.from), to: formatDate(done.to) })}
        </Text>
      )}
      {error && (
        <Alert color={notStarted ? "gray" : "red"} role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
