import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import "dayjs/locale/ru";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./print.css";
import { Gate } from "./shell/Gate";
import { theme } from "./theme";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: "ru" }}>
        <ConvexProvider client={convex}>
          <BrowserRouter>
            <Gate />
          </BrowserRouter>
        </ConvexProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
