// Setup entry only (task 1.1). The frontend skeleton (task 5.2) replaces it with the providers and the shell.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { t } from "../shared/strings";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main>{t("ru", "app.name")}</main>
  </StrictMode>,
);
