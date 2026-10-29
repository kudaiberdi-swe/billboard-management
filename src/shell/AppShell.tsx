// App frame (design D9): left menu with the 6 sections in contract route order, the reset-demo and sign-out buttons.
import { Alert, Button, Group, AppShell as MantineAppShell, Modal, NavLink, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Navigate, NavLink as RouterNavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t, type StringsKey } from "../../shared/strings";
import { signOut, useGuardedMutation, useSubmit } from "../session";
import { NAVBAR_WIDTH } from "../theme";
import { Analytics } from "../routes/Analytics";
import { Billboards } from "../routes/Billboards";
import { BillboardCard } from "../routes/billboards/BillboardCard";
import { Campaigns } from "../routes/Campaigns";
import { CampaignCard } from "../routes/campaigns/CampaignCard";
import { Home } from "../routes/Home";
import { Reports } from "../routes/Reports";
import { Schedule } from "../routes/Schedule";
import { NewCampaign } from "../routes/campaigns/NewCampaign";

const SECTIONS: { path: string; label: StringsKey; Page: () => React.JSX.Element }[] = [
  { path: "/", label: "routes.home", Page: Home },
  { path: "/billboards", label: "routes.billboards", Page: Billboards },
  { path: "/campaigns", label: "routes.campaigns", Page: Campaigns },
  { path: "/schedule", label: "routes.schedule", Page: Schedule },
  { path: "/analytics", label: "routes.analytics", Page: Analytics },
  { path: "/reports", label: "routes.reports", Page: Reports },
];

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <MantineAppShell navbar={{ width: NAVBAR_WIDTH, breakpoint: 0 }} padding="lg">
      <MantineAppShell.Navbar className="no-print" p="md" aria-label={t("ru", "common.menu")}>
        <Text fw={700} size="lg" px="sm" mb="md">
          {t("ru", "app.name")}
        </Text>
        <Stack gap={2} style={{ flex: 1 }}>
          {SECTIONS.map(({ path, label }) => (
            <NavLink
              key={path}
              component={RouterNavLink}
              to={path}
              end={path === "/"}
              label={t("ru", label)}
              active={path === "/" ? pathname === "/" : pathname.startsWith(path)}
            />
          ))}
        </Stack>
        <Stack gap={4}>
          <ResetDemo />
          {/* client-side sign-out: forgets the session id; the Gate shows the password screen */}
          <Button variant="subtle" color="gray" size="sm" justify="flex-start" onClick={signOut}>
            {t("ru", "common.signOut")}
          </Button>
        </Stack>
      </MantineAppShell.Navbar>
      <MantineAppShell.Main>
        <Routes>
          {SECTIONS.map(({ path, Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="/billboards/:id" element={<BillboardCard />} />
          <Route path="/campaigns/:id" element={<CampaignCard />} />
          <Route path="/campaigns/new" element={<NewCampaign />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

function ResetDemo() {
  const [opened, { open, close }] = useDisclosure(false);
  const reset = useGuardedMutation(api.demo.reset);
  const navigate = useNavigate();
  const { submit: confirm, busy, error } = useSubmit(async () => {
    await reset({});
    close();
    navigate("/");
  });

  return (
    <>
      {/* fde-echo:local-only opens the confirmation; the reset itself is the confirm button below */}
      <Button variant="subtle" color="red" size="sm" justify="flex-start" onClick={open}>
        {t("ru", "demo.reset")}
      </Button>
      <Modal opened={opened} onClose={close} title={<Title order={2} size="h4">{t("ru", "demo.resetTitle")}</Title>}>
        <Stack>
          <Text>{t("ru", "demo.resetBody")}</Text>
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            {/* fde-echo:local-only closes the dialog; nothing is saved */}
            <Button variant="default" onClick={close} disabled={busy}>
              {t("ru", "demo.cancel")}
            </Button>
            <Button color="red" onClick={() => confirm()} loading={busy}>
              {t("ru", "demo.reset")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
