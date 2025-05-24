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

app.get(/^\/____react____\/.*\/?$/, (req, res) => {
  try {
    const possibleExtensions = [".tsx", ".jsx", ".js"];
    let appPath = null;
    const folderPath = (
      req.path.endsWith("/") ? req.path : req.path + "/"
    ).replace("/____react____", "");

    for (const ext of possibleExtensions) {
      const candidatePath = path.resolve(
        process.cwd(),
        `src${folderPath}page${ext}`
      );
      if (existsSync(candidatePath)) {
        appPath = candidatePath;
        break;
      }
    }

    if (!appPath) {
      return res
        .status(404)
        .send(
          `Page not found: No page file found in src${folderPath} with supported extensions (.js, .jsx, .tsx)`
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
      React.createElement(ReactApp, { params: { ...req.query } }),
      moduleMap
    );
    pipe(res);
  } catch (error) {
    console.error("Error rendering RSC:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Render HTML via child process, returning a stream
async function renderAppToHtml(folderPath, paramsString) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [
      path.resolve(__dirname, "render-html.js"),
      folderPath,
      paramsString,
    ]);

    let errorOutput = "";
    child.stderr.on("data", (data) => {
      errorOutput += data;
    });

    child.on("close", (code) => {
      if (code !== 0) {
        try {
          const errorResult = JSON.parse(errorOutput);
          reject(new Error(errorResult.error));
        } catch {
          reject(new Error(`Child process failed: ${errorOutput}`));
        }
      }
    });

    // Devolver el stream directamente
    resolve(child.stdout);
  });
}

app.get(/^\/.*\/?$/, async (req, res) => {
  try {
    const possibleExtensions = [".tsx", ".jsx", ".js"];
    let appPath = null;

    const folderPath = req.path.endsWith("/") ? req.path : req.path + "/";

    for (const ext of possibleExtensions) {
      const candidatePath = path.resolve(
        process.cwd(),
        `src${folderPath}page${ext}`
      );
      if (existsSync(candidatePath)) {
        appPath = candidatePath;
        break;
      }
    }

    if (!appPath) {
      return res
        .status(404)
        .send(
          `Page not found: No page file found in src${folderPath} with supported extensions (.js, .jsx, .tsx)`
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

    // Dividir la plantilla HTML en partes
    const [htmlStart, htmlEnd] = htmlTemplate.split('<div id="root"></div>');

    // Renderizar el RSC payload como stream
    const { pipe: pipeRsc } = renderToPipeableStream(
      React.createElement(ReactApp, { params: { ...req.query } }),
      moduleMap
    );

    // Obtener el stream del subproceso
    const appHtmlStream = await renderAppToHtml(
      folderPath,
      JSON.stringify({ ...req.query })
    );

    // Configurar la respuesta como stream
    res.setHeader("Content-Type", "text/html");

    // Enviar el inicio del HTML
    res.write(htmlStart);
    res.write('<div id="root">');

    // Pipe el stream del subproceso (HTML del componente)
    // const logStream = createWriteStream("debug.html");
    // appHtmlStream.pipe(logStream);
    appHtmlStream.pipe(res, { end: false });
    // let appHtml = "";
    // appHtmlStream.on("data", (chunk) => {
    //   appHtml += chunk.toString();
    // });
    // Cuando el stream del subproceso termine, continuar con el RSC payload y el final del HTML
    appHtmlStream.on("end", () => {
      // console.error("Captured appHtml:", appHtml);
      // res.write(appHtml);
      res.write("</div>");

      // Capturar el RSC payload como string
      let rscPayload = "";
      const { Writable } = require("stream");
      const rscWritable = new Writable({
        write(chunk, encoding, callback) {
          rscPayload += chunk.toString();
          callback();
        },
      });

      pipeRsc(rscWritable);

      rscWritable.on("finish", () => {
        // Inyectar el RSC payload como script
        res.write(
          `<script>window.__RSC_PAYLOAD = ${JSON.stringify(
            rscPayload
          )};</script>`
        );

        // Enviar el final del HTML
        res.write(htmlEnd);
        res.end();
      });
    });

    appHtmlStream.on("error", (error) => {
      console.error("Stream error:", error);
      res.status(500).send("Internal Server Error");
    });
  } catch (error) {
    console.error("Error rendering React app:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
