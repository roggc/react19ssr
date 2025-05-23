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

app.use(express.static(path.resolve(process.cwd(), "public")));

// Escape JavaScript string for script tags
function escapeJSString(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Render HTML via child process
async function renderAppToHtml(appPath, manifestPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [
      path.resolve(__dirname, "render-html-v2.js"),
      appPath,
      manifestPath,
    ]);
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
      path.resolve(process.cwd(), "index.html"),
      "utf8"
    );

    // Render the app as an RSC stream
    const { pipe } = renderToPipeableStream(
      React.createElement(ReactApp),
      moduleMap
    );

    const appHtml = await renderAppToHtml(appPath, manifestPath);

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

    // // Capture RSC payload
    // let rscPayload = "";
    // const writable = new Writable({
    //   write(chunk, encoding, callback) {
    //     rscPayload += chunk.toString();
    //     callback();
    //   },
    // });

    // // Render HTML in child process
    // const appHtml = await renderAppToHtml(appPath, manifestPath);

    // // Combine template with app HTML and RSC payload
    // const escapedPayload = escapeJSString(rscPayload);
    // const html = htmlTemplate
    //   .replace(
    //     "<!--RSC_PAYLOAD-->",
    //     `<script>window.__RSC_PAYLOAD = "${escapedPayload}";</script>`
    //   )
    //   .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);

    // // Send response
    // res.setHeader("Content-Type", "text/html");
    // res.send(html);

    // // Pipe RSC stream to writable (after sending HTML)
    // pipe(writable);
  } catch (error) {
    console.error("Error rendering React app:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
