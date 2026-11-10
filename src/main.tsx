import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { IbcCustomizer } from "./components/ibc/IbcCustomizer";
import { applyTheme, loadTheme } from "./lib/theme";

applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IbcCustomizer>
      <App />
    </IbcCustomizer>
  </StrictMode>
);
