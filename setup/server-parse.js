require("dotenv/config");
const register = require("react-server-dom-webpack/node-register");
const path = require("path");
const { readFileSync, existsSync } = require("fs");
const { renderToPipeableStream } = require("react-server-dom-webpack/server");
const express = require("express");
const React = require("react");
const babelRegister = require("@babel/register");

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

// Serve static files
app.use(express.static(path.resolve(process.cwd(), "public")));

// Parse RSC payload to HTML
function parseRSCPayloadToHtml(payload) {
  const lines = payload.split("\n").filter(Boolean);
  let html = "";
  for (const line of lines) {
    try {
      const match = line.match(/^(\d+|[A-Za-z]+):(.+)$/);
      let json;
      if (match) {
        const [, , jsonStr] = match;
        json = JSON.parse(jsonStr);
      } else {
        json = JSON.parse(line);
      }
      html += jsonToHtml(json);
    } catch (error) {
      console.log("Skipped RSC line:", line);
    }
  }
  return html;
}

// Convert RSC JSON to HTML
function jsonToHtml(json) {
  if (!json || typeof json !== "object") return "";
  if (Array.isArray(json) && json[0] === "$") {
    const [, tag, , props = {}] = json;
    if (!tag) return "";
    const children = Array.isArray(props.children)
      ? props.children.map(jsonToHtml).join("")
      : typeof props.children === "string"
      ? escapeHtml(props.children)
      : jsonToHtml(props.children);
    const attrs = Object.entries(props)
      .filter(([key]) => key !== "children")
      .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
      .join(" ");
    return `<${tag}${attrs ? " " + attrs : ""}>${children}</${tag}>`;
  }
  if (typeof json === "string") return escapeHtml(json);
  if (Array.isArray(json)) return json.map(jsonToHtml).join("");
  if (json?.children) return jsonToHtml(json.children);
  return "";
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

// Initial render route (RSC streaming)
app.get("/", (req, res) => {
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

    // Read the client manifest for RSC
    const manifest = readFileSync(
      path.resolve(process.cwd(), "public/react-client-manifest.json"),
      "utf8"
    );
    const moduleMap = JSON.parse(manifest);

    // Read the HTML template
    const htmlTemplate = readFileSync(
      path.resolve(process.cwd(), "index.html"),
      "utf8"
    );

    // Render the app as an RSC stream
    const { pipe } = renderToPipeableStream(
      React.createElement(ReactApp),
      moduleMap
    );

    // Create a transform stream to capture the RSC payload
    const { Writable } = require("stream");
    class HtmlWritable extends Writable {
      constructor() {
        super();
        this.chunks = [];
      }
      _write(chunk, encoding, callback) {
        this.chunks.push(chunk);
        callback();
      }
      end() {
        const rscPayload = Buffer.concat(this.chunks).toString("utf8");
        const appHtml = parseRSCPayloadToHtml(rscPayload);
        const html = htmlTemplate
          .replace(
            "<!--RSC_PAYLOAD-->",
            `<script>window.__RSC_PAYLOAD = ${JSON.stringify(
              rscPayload
            )};</script>`
          )
          .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);
        res.setHeader("Content-Type", "text/html");
        res.send(html);
        super.end();
      }
    }

    pipe(new HtmlWritable());
  } catch (error) {
    console.error("Error rendering React app:", error);
    res.status(500).send("Internal Server Error");
  }
});

// RSC endpoint for dynamic updates
app.get("/react", (req, res) => {
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

    const { pipe } = renderToPipeableStream(
      React.createElement(ReactApp),
      moduleMap
    );
    pipe(res);
  } catch (error) {
    console.error("Error rendering RSC:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
