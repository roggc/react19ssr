require("@babel/register")({
  ignore: [/[\\\/](build|server|node_modules)[\\\/]/],
  presets: [
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});
const { renderToPipeableStream } = require("react-dom/server");
const React = require("react");
const path = require("path");
const { existsSync } = require("fs");

try {
  function getApp() {
    const possibleExtensions = [".tsx", ".jsx", ".js"];
    let appPath = null;
    const folderPath = "/" || process.argv[2];
    const params = {} || JSON.parse(process.argv[3]);

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
      throw new Error(
        `No page file found in src${folderPath} with supported extensions (.js, .jsx, .tsx)`
      );
    }

    const appModule = require(appPath);
    const App = appModule.default ?? appModule;
    return { App, params };
  }

  // Function to check if a component is a client component
  function isClientComponent(type) {
    if (typeof type !== "function") {
      return false;
    }
    const isAsync =
      type instanceof Object.getPrototypeOf(async function () {}).constructor;
    if (isAsync) {
      return false;
    }
    return true;
  }

  // Adapted renderJSXToClientJSX
  async function renderJSXToClientJSX(jsx, key = null) {
    if (
      typeof jsx === "string" ||
      typeof jsx === "number" ||
      typeof jsx === "boolean" ||
      typeof jsx === "function" ||
      typeof jsx === "undefined" ||
      jsx == null
    ) {
      return jsx;
    } else if (Array.isArray(jsx)) {
      return await Promise.all(
        jsx.map(
          async (child, i) =>
            await renderJSXToClientJSX(
              child,
              i + (typeof child?.type === "string" ? "_" + child?.type : "")
            )
        )
      );
    } else if (typeof jsx === "symbol") {
      if (jsx === Symbol.for("react.fragment")) {
        // Handle Fragment as an empty props object
        return {
          $$typeof: Symbol.for("react.element"),
          type: Symbol.for("react.fragment"),
          props: {},
          key: key,
        };
      }
      console.error("Unsupported symbol:", String(jsx));
      throw new Error(`Unsupported symbol: ${String(jsx)}`);
    } else if (typeof jsx === "object") {
      if (jsx.$$typeof === Symbol.for("react.transitional.element")) {
        // console.log("Transitional element detected:", jsx);
        if (jsx.type === Symbol.for("react.fragment")) {
          return {
            ...jsx,
            props: await renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (jsx.type === Symbol.for("react.suspense")) {
          return {
            ...jsx,
            props: await renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (typeof jsx.type === "string") {
          // HTML elements (e.g., <div>, <h1>)
          return {
            ...jsx,
            props: await renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (typeof jsx.type === "function") {
          const Component = jsx.type;
          const props = jsx.props;
          if (isClientComponent(Component)) {
            return {
              $$typeof: Symbol.for("react.transitional.element"),
              type: Component,
              props: await renderJSXToClientJSX(props),
              key: key ?? jsx.key,
            };
          } else {
            // Server component: execute and process
            const returnedJsx = await Component(props);
            return await renderJSXToClientJSX(returnedJsx, key ?? jsx.key);
          }
        } else {
          console.error("Unsupported JSX type:", jsx.type);
          throw new Error("Unsupported JSX type");
        }
      } else if (jsx instanceof Promise) {
        console.warn("Received a Promise in JSX");
        // return await renderJSXToClientJSX(await jsx, key);
        return jsx;
      } else {
        // Process object props (e.g., { className: "foo" })
        return Object.fromEntries(
          await Promise.all(
            Object.entries(jsx).map(async ([propName, value]) => [
              propName,
              await renderJSXToClientJSX(value),
            ])
          )
        );
      }
    } else {
      throw new Error("Not implemented");
    }
  }

  // Renderizar el componente como stream
  async function renderToStream() {
    try {
      const { App, params } = getApp();
      const clientJsx = renderJSXToClientJSX(
        React.createElement(App, { params })
      );
      const stream = renderToPipeableStream(clientJsx, {
        onError(error) {
          console.error("Render error:", error);
          process.stderr.write(JSON.stringify({ error: error.message }));
        },
        // onAllReady() {
        //   // Enviar el stream a stdout
        //   stream.pipe(process.stdout);
        // },
        onShellReady() {
          stream.pipe(process.stdout);
        },
      });
    } catch (error) {
      process.stderr.write(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  }

  renderToStream();
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error.message }));
  process.exit(1);
}
