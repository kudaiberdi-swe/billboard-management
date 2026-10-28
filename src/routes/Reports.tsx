// Reports section (f09-reports): filters in the URL, the report of one campaign, browser print (ADR-0010).
import { Alert, Center, Loader, Stack, Text, Title } from "@mantine/core";
import { useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { useGuardedQuery } from "../session";
import { Boundary } from "./billboards/Boundary";
import { ReportFilters, useReportFilters, type ReportFilterValue } from "./reports/ReportFilters";
import { ReportView } from "./reports/ReportView";

export function Reports() {
  const filters = useReportFilters();
  const { search } = useLocation();
  const { campaignId } = filters;
  return (
    <Stack gap="lg">
      <Title order={1} className="no-print">
        {t("ru", "routes.reports")}
      </Title>
      {campaignId === undefined ? (
        <>
          <ReportFilters value={filters} />
          <Text c="dimmed">{t("ru", "reports.selectCampaign")}</Text>
        </>
      ) : (
        // key: new filters retry after a failure (for example a campaign removed by the demo reset)
        <Boundary
          key={search}
          fallback={(error) => {
            if (errorCode(error) === "UNAUTHENTICATED") throw error; // on to the app gate (password screen)
            return (
              <>
                <ReportFilters value={filters} />
                <Alert color="red" role="alert">
                  {errorText(error)}
                </Alert>
              </>
            );
          }}
        >
          <ReportArea filters={{ ...filters, campaignId }} />
        </Boundary>
      )}
    </Stack>
  );
}

function ReportArea({ filters }: { filters: ReportFilterValue & { campaignId: string } }) {
  const data = useGuardedQuery(api.reports.campaign, filters);
  return (
    <>
      <ReportFilters value={filters} options={data?.options} />
      {data === undefined ? (
        <Center py="xl" aria-busy="true">
          <Loader aria-label={t("ru", "common.loading")} />
        </Center>
      ) : (
        <ReportView data={data} />
      )}
    </>
  );
}
