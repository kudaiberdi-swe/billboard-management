import { useState } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { t } from "../../shared/strings";
import { errorCode, errorField } from "../errors";
import { formatDate } from "../format";
import { useGuardedMutation, useSubmit } from "../session";
import { ACTION_NOTE_WIDTH } from "../theme";

/** The simulate-shows button of the campaign card (f10-simulate-shows); the card re-reads the log reactively. */
export function SimulateShowsButton({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const simulate = useGuardedMutation(api.showLog.simulate);
  const [done, setDone] = useState<{ from: string; to: string }>();
  const { submit, busy, error, failure } = useSubmit(async () => {
    setDone(undefined);
    setDone(await simulate({ campaignId }));
  });
  // A campaign before its start date is an expected state, not a failure: say why (calm tone) and keep the button off.
  const notStarted = errorCode(failure) === "CAMPAIGN_NOT_STARTED";
  // The backend refuses with INVALID_INPUT on campaignId when the show log has no room left (LOG_ROW_BUDGET).
  const logFull = errorCode(failure) === "INVALID_INPUT" && errorField(failure) === "campaignId";
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
          {logFull ? t("ru", "simulate.logFull") : error}
        </Alert>
      )}
    </Stack>
  );
}
