import { use } from "react";
import {
  createFromFetch,
  createFromReadableStream,
} from "react-server-dom-webpack/client";
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
    if (window.__RSC_PAYLOAD) {
      console.log("Using server-injected RSC payload");
      try {
        const response = new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(window.__RSC_PAYLOAD)
              );
              controller.close();
            },
          })
        );
        content = createFromReadableStream(response.body);
      } catch (error) {
        console.error("Error parsing RSC payload:", error);
        content = createFromFetch(fetch("/____react____"));
      }
    } else {
      console.log("Fetching RSC payload from /____react____");
      content = createFromFetch(fetch("/____react____" + route));
    }
    cache.set(route, content);
  }

  return <>{use(content)}</>;
}

// Hydrate the root element with the React app
hydrateRoot(domElement, <Root />);
