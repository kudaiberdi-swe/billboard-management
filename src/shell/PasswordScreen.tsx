// Password screen (app-shell «Password screen», ADR-0003). The server checks the password and the rate limit.
import { Alert, Button, Center, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { useGuardedMutation, useSubmit } from "../session";
import { LOGIN_WIDTH } from "../theme";

export function PasswordScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const signIn = useGuardedMutation(api.demo.signIn);
  const { submit, busy, error } = useSubmit(async (password: string) => {
    const result = await signIn({ password });
    // WRONG_PASSWORD is a result, not a throw (D3a); raise it so it shows like any other code.
    if (!result.ok) throw new ConvexError({ code: result.code });
    onSignedIn();
  });

  return (
    <Center component="main" mih="100vh" bg="gray.0">
      <form
        style={{ width: LOGIN_WIDTH }}
        onSubmit={(e) => {
          e.preventDefault();
          return submit(String(new FormData(e.currentTarget).get("password") ?? ""));
        }}
      >
        <Stack>
          <div>
            <Title order={1}>{t("ru", "app.name")}</Title>
            <Text c="dimmed">{t("ru", "errors.UNAUTHENTICATED")}</Text>
          </div>
          <PasswordInput
            name="password"
            label={t("ru", "login.password")}
            error={error ? true : undefined}
            autoComplete="current-password"
            autoFocus
            required
          />
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={busy}>
            {t("ru", "login.submit")}
          </Button>
        </Stack>
      </form>
    </Center>
  );
}
