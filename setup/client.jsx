import { use } from "react";
import {
  createFromFetch,
  createFromReadableStream,
} from "react-server-dom-webpack/client";
import { createRoot } from "react-dom/client";

const domElement = document.getElementById("root");
if (!domElement) {
  throw new Error("Root element not found");
}

const cache = new Map();

function Root() {
  let content = cache.get("home");
  if (!content) {
    if (window.__RSC_PAYLOAD) {
      console.log("Using server-injected RSC payload:", window.__RSC_PAYLOAD);
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
        content = createFromFetch(fetch("/react"));
      }
    } else {
      console.log("Fetching RSC payload from /react");
      content = createFromFetch(fetch("/react"));
    }
    cache.set("home", content);
  }

  return <>{use(content)}</>;
}

// Render the app
const root = createRoot(domElement);
root.render(<Root />);
