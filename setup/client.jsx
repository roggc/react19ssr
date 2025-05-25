import { use } from "react";
import { createFromFetch } from "react-server-dom-webpack/client";
import { hydrateRoot } from "react-dom/client";

const domElement = document.getElementById("root");
if (!domElement) {
  throw new Error("Root element not found");
}

const cache = new Map();
const route = window.location.href.replace(window.location.origin, "");

function Root() {
  let content = cache.get(route);
  if (!content) {
    content = createFromFetch(fetch("/____rsc_payload____" + route));
    cache.set(route, content);
  }

  return <>{use(content)}</>;
}

// Hydrate the root element with the React app
hydrateRoot(domElement, <Root />);
