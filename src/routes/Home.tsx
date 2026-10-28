// Home page (f02-dashboard): filters in the URL, network cards, occupancy chart, screens per city,
// active campaigns (all filtered) and the network-wide in-app notifications (not filtered).
import { Component, type ReactNode } from "react";
import { Alert, Center, Grid, Loader, Stack, Title } from "@mantine/core";
import { useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { useGuardedQuery } from "../session";
import { ActiveList, NotificationList, OccupancyChart, ScreensByCity } from "./home/Blocks";
import { Cards } from "./home/Cards";
import { Filters, useFilters, type DashboardFilters } from "./home/Filters";

export function Home() {
  const filters = useFilters();
  const { search } = useLocation();
  return (
    <Stack gap="lg">
      <Title order={1}>{t("ru", "routes.home")}</Title>
      {/* key: a period set elsewhere (menu link to the page) resets the picker's local range */}
      <Filters key={filters.from + filters.to} value={filters} />
      <Grid gap="lg">
        <Grid.Col span={9}>
          {/* key: new filters retry after a failure (for example a stale billboard after the demo reset) */}
          <Failed key={search}>
            <SummaryArea filters={filters} />
          </Failed>
        </Grid.Col>
        <Grid.Col span={3}>
          <Failed>
            <Notifications />
          </Failed>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function SummaryArea({ filters }: { filters: DashboardFilters }) {
  const data = useGuardedQuery(api.dashboard.summary, filters);
  if (data === undefined) return <Busy />;
  return (
    <Stack gap="lg">
      <Cards data={data} />
      <OccupancyChart days={data.occupancyByDay} />
      <Grid gap="lg">
        <Grid.Col span={4}>
          <ScreensByCity cities={data.screensByCity} />
        </Grid.Col>
        <Grid.Col span={8}>
          <ActiveList campaigns={data.activeList} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function Notifications() {
  const items = useGuardedQuery(api.dashboard.notifications, {});
  return items === undefined ? <Busy /> : <NotificationList items={items} />;
}

function Busy() {
  return (
    <Center py="xl" aria-busy="true">
      <Loader aria-label={t("ru", "common.loading")} />
    </Center>
  );
}

/** A failed query shows its error text in place; UNAUTHENTICATED goes on to the app gate (password screen). */
class Failed extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (error === undefined) return this.props.children;
    if (errorCode(error) === "UNAUTHENTICATED") throw error;
    return (
      <Alert color="red" role="alert">
        {errorText(error)}
      </Alert>
    );
  }
}
