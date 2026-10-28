import { useState } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { t } from "../../shared/strings";
import { date } from "../routes/campaigns/format";
import { useGuardedMutation, useSubmit } from "../session";

/** The simulate-shows button of the campaign card (f10-simulate-shows); the card re-reads the log reactively. */
export function SimulateShowsButton({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const simulate = useGuardedMutation(api.showLog.simulate);
  const [done, setDone] = useState<{ from: string; to: string }>();
  const { submit, busy, error } = useSubmit(async () => {
    setDone(undefined);
    setDone(await simulate({ campaignId }));
  });
  return (
    <Stack gap="xs" align="flex-end">
      <Button onClick={() => submit()} loading={busy}>
        {t("ru", "simulate.button")}
      </Button>
      {done && (
        <Text role="status" size="sm">
          {t("ru", "simulate.done", { from: date(done.from), to: date(done.to) })}
        </Text>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
