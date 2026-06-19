import React from "react";
import ReactDOM from "react-dom/client";
import { CaptureApp } from "./components/capture/CaptureApp";
import "./theme/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CaptureApp />
  </React.StrictMode>,
);
