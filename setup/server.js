require("dotenv/config");
const register = require("react-server-dom-webpack/node-register");
const path = require("path");
const { readFileSync, existsSync } = require("fs");
const { renderToPipeableStream } = require("react-server-dom-webpack/server");
const express = require("express");
const React = require("react");
const { spawn } = require("child_process");
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

// Render HTML via child process
async function renderAppToHtml() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [path.resolve(__dirname, "render-html.js")]);
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (errorOutput += data));

    child.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result.html);
        } catch (error) {
          reject(new Error(`Failed to parse child output: ${error.message}`));
        }
      } else {
        try {
          const errorResult = JSON.parse(errorOutput);
          reject(new Error(errorResult.error));
        } catch {
          reject(new Error(`Child process failed: ${errorOutput}`));
        }
      }
    });
  });
}

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

    // Read the client manifest for RSC
    const manifestPath = path.resolve(
      process.cwd(),
      "public/react-client-manifest.json"
    );
    const manifest = readFileSync(manifestPath, "utf8");
    const moduleMap = JSON.parse(manifest);

    // Read the HTML template
    const htmlTemplate = readFileSync(
      path.resolve(process.cwd(), "public/index.html"),
      "utf8"
    );

    // Render the app as an RSC stream
    const { pipe } = renderToPipeableStream(
      React.createElement(ReactApp),
      moduleMap
    );

    const appHtml = await renderAppToHtml();

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

app.use(express.static(path.resolve(process.cwd(), "public")));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
