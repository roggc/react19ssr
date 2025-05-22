require("dotenv/config");
const register = require("react-server-dom-webpack/node-register");
const path = require("path");
const { readFileSync, existsSync } = require("fs");
const express = require("express");
const React = require("react");
const { PassThrough } = require("stream");
const babelRegister = require("@babel/register");

// Try edge-compatible imports
let renderToReadableStream, renderToPipeableStream;
try {
  renderToReadableStream =
    require("react-dom/server.edge").renderToReadableStream;
  renderToPipeableStream =
    require("react-server-dom-webpack/server.edge").renderToPipeableStream;
} catch (error) {
  console.warn(
    "Edge imports unavailable, falling back to server:",
    error.message
  );
  renderToPipeableStream =
    require("react-server-dom-webpack/server").renderToPipeableStream;
}

const { injectRSCPayload } = require("rsc-html-stream/server");

register();
babelRegister({
  ignore: [/[\\\/](build|server|node_modules)[\\\/]/],
  presets: [
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
  plugins: ["@babel/transform-modules-commonjs"],
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});

const app = express();

app.use(express.static(path.resolve(process.cwd(), "public")));

app.get("/", async (req, res) => {
  try {
    const possibleExtensions = [".tsx", ".ts", ".jsx", ".js"];
    let appPath = null;

    for (const ext of possibleExtensions) {
      const candidatePath = path.resolve(process.cwd(), `src/app${ext}`);
      if (existsSync(candidatePath)) {
        appPath = candidatePath;
        break;
      }
    }

    if (!appPath) {
      throw new Error(
        "No app file found in src/ with supported extensions (.js, .jsx, .ts, .tsx)"
      );
    }

    const appModule = require(appPath);
    const ReactApp = appModule.default ?? appModule;

    const manifest = readFileSync(
      path.resolve(process.cwd(), "public/react-client-manifest.json"),
      "utf8"
    );
    const moduleMap = JSON.parse(manifest);

    // Generate RSC payload
    const rscStream = renderToPipeableStream(
      React.createElement(ReactApp),
      moduleMap
    ).pipe(new PassThrough());

    // Fork the RSC stream
    const [rscStream1, rscStream2] = rscStream.tee();

    // Render HTML stream (only if renderToReadableStream is available)
    let htmlStream;
    if (renderToReadableStream) {
      const {
        createFromReadableStream,
      } = require("react-server-dom-webpack/client");
      let data;
      function Content() {
        data ??= createFromReadableStream(rscStream1);
        return React.use(data);
      }
      htmlStream = await renderToReadableStream(React.createElement(Content));
    } else {
      // Fallback: Read index.html and use minimal HTML
      const htmlTemplate = readFileSync(
        path.resolve(process.cwd(), "index.html"),
        "utf8"
      );
      const appHtml = "<div>Loading...</div>"; // Minimal fallback
      const htmlContent = htmlTemplate.replace(
        `<div id="root"></div>`,
        `<div id="root">${appHtml}</div>`
      );
      htmlStream = require("stream").Readable.from([htmlContent]);
    }

    // Inject RSC payload
    const responseStream = htmlStream.pipeThrough(injectRSCPayload(rscStream2));

    // Send response
    res.setHeader("Content-Type", "text/html");
    responseStream.pipe(res);
  } catch (error) {
    console.error("Error rendering React app:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
