import { use } from "react";
import { createFromReadableStream } from "react-server-dom-webpack/client";
import { hydrateRoot } from "react-dom/client";
import { rscStream } from "rsc-html-stream/client";

const domElement = document.getElementById("root");
if (!domElement) {
  throw new Error("Root element not found");
}

const cache = new Map();

function Root() {
  let content = cache.get("home");
  if (!content) {
    console.log("Using RSC stream from rsc-html-stream");
    content = createFromReadableStream(rscStream);
    cache.set("home", content);
  }

  return <>{use(content)}</>;
}

hydrateRoot(domElement, <Root />);
