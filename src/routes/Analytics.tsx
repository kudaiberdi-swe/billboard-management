// Audience analytics section (f08-audience-analytics): billboard and period in the URL; the simulated audience of
// that screen from analytics.screenPeriod (all numbers from the locked generator), or audience.noCamera.
import { Alert, Center, Grid, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { useGuardedQuery } from "../session";
import { AgeBlock, Cards, GenderBlock, HourChart, Terms } from "./analytics/Blocks";
import { Filters, useFilters, type AnalyticsFilters } from "./analytics/Filters";
import { Boundary } from "./billboards/Boundary";

export function Analytics() {
  const options = useGuardedQuery(api.screens.options, {});
  const filters = useFilters(options);
  const { search } = useLocation();
  return (
    <Stack gap="lg">
      <Title order={1}>{t("ru", "routes.analytics")}</Title>
      {/* key: a period set elsewhere (menu link to the page) resets the picker's local range */}
      <Filters key={filters.from + filters.to} value={filters} options={options} />
      {/* key: new filters retry after a failure (for example a stale billboard after the demo reset) */}
      <Boundary key={search} fallback={failure}>
        {filters.screenId === undefined ? <Busy /> : <Period filters={{ ...filters, screenId: filters.screenId }} />}
      </Boundary>
    </Stack>
  );
}

/** UNAUTHENTICATED goes on to the app gate (password screen); other codes show their text in place. */
function failure(error: unknown) {
  if (errorCode(error) === "UNAUTHENTICATED") throw error;
  return (
    <Alert color="red" role="alert">
      {errorText(error)}
    </Alert>
  );
}

function Period({ filters }: { filters: Required<AnalyticsFilters> }) {
  const data = useGuardedQuery(api.analytics.screenPeriod, filters);
  if (data === undefined) return <Busy />;
  const { audience } = data;
  if (audience === null) {
    return (
      <Paper withBorder p="lg" component="section" aria-labelledby="no-camera">
        <Stack gap="xs" maw="65ch">
          <Title order={2} size="h4" id="no-camera">
            {t("ru", "audience.noCameraTitle")}
          </Title>
          <Text>{t("ru", "audience.noCameraBody", { name: data.screen.name })}</Text>
        </Stack>
      </Paper>
    );
  }
  return (
    <Stack gap="lg">
      <Cards audience={audience} />
      <HourChart byHour={audience.byHour} />
      <Grid gap="lg">
        <Grid.Col span={4}>
          <AgeBlock age={audience.profile.age} />
        </Grid.Col>
        <Grid.Col span={4}>
          <GenderBlock gender={audience.profile.gender} />
        </Grid.Col>
        <Grid.Col span={4}>
          <Terms />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function Busy() {
  return (
    <Center py="xl" aria-busy="true">
      <Loader aria-label={t("ru", "common.loading")} />
    </Center>
  );
}
