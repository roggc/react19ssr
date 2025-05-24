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
const { Transform } = require("stream");

class RemoveWrapperDivTransform extends Transform {
  constructor() {
    super();
    this.divDepth = 0; // Contador de anidación de divs
    this.isWrapperDivRemoved = false; // Bandera para el div inicial
    this.buffer = ""; // Buffer para manejar etiquetas divididas entre chunks
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    let output = "";
    let i = 0;

    while (i < this.buffer.length) {
      // Buscar etiquetas <div> o </div>
      if (this.buffer[i] === "<") {
        if (this.buffer.startsWith("<div", i)) {
          // Posible div inicial
          const divEnd = this.buffer.indexOf(">", i);
          if (divEnd === -1) {
            // Etiqueta incompleta, esperar más datos
            break;
          }
          const divTag = this.buffer.slice(i, divEnd + 1);
          if (divTag.includes("____rendertopipeablestreamfix____")) {
            // Encontramos el div envolvente
            if (!this.isWrapperDivRemoved) {
              this.isWrapperDivRemoved = true;
              i = divEnd + 1; // Saltar la etiqueta
              continue;
            }
          }
          // Incrementar contador para cualquier div
          this.divDepth++;
          output += divTag;
          i = divEnd + 1;
        } else if (this.buffer.startsWith("</div>", i)) {
          // Div de cierre
          if (this.isWrapperDivRemoved && this.divDepth === 1) {
            // Este es el </div> del wrapper, omitirlo
            this.divDepth--;
            i += 6; // Saltar </div>
            continue;
          }
          this.divDepth--;
          output += "</div>";
          i += 6;
        } else {
          // Otra etiqueta, pasar sin cambios
          output += this.buffer[i];
          i++;
        }
      } else {
        output += this.buffer[i];
        i++;
      }
    }
    // Actualizar buffer con datos no procesados
    this.buffer = this.buffer.slice(i);
    this.push(output);
    callback();
  }

  _flush(callback) {
    // Enviar cualquier dato restante en el buffer
    if (this.buffer) {
      this.push(this.buffer);
      this.buffer = "";
    }
    callback();
  }
}

try {
  function getApp() {
    const possibleExtensions = [".tsx", ".jsx", ".js"];
    let appPath = null;
    const folderPath = process.argv[2];
    const params = JSON.parse(process.argv[3]);

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
  function renderJSXToClientJSX(jsx, key = null) {
    console.warn("renderJSXToClientJSX called with:", jsx, key);
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
      // console.warn("array jsx detected:", jsx);
      return jsx.map((child, i) =>
        renderJSXToClientJSX(
          child,
          i + (typeof child?.type === "string" ? "_" + child?.type : "")
        )
      );
      // return jsx.map((child, i) => ({
      //   $$typeof: Symbol.for("react.transitional.element"),
      //   type: Symbol.for("react.fragment"),
      //   props: { children: renderJSXToClientJSX(child) },
      //   key: i + (typeof child?.type === "string" ? "_" + child?.type : ""),
      // }));
    } else if (typeof jsx === "symbol") {
      if (jsx === Symbol.for("react.fragment")) {
        // Handle Fragment as an empty props object
        return {
          $$typeof: Symbol.for("react.transitional.element"),
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
          // console.warn("jsx.props", jsx.props);
          return {
            ...jsx,
            props: renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (jsx.type === Symbol.for("react.suspense")) {
          // const { fallback, children } = jsx.props;
          // if (children instanceof Promise) {
          //   console.warn("Suspense children is a Promise, awaiting...");
          //   return {
          //     ...jsx,
          //     props: {
          //       fallback: renderJSXToClientJSX(fallback),
          //       children: children.then((resolvedChildren) =>
          //         renderJSXToClientJSX(resolvedChildren)
          //       ),
          //     },
          //     key: key ?? jsx.key,
          //   };
          // }
          console.warn("Suspense element detected:", jsx);
          return {
            ...jsx,
            props: renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (typeof jsx.type === "string") {
          // HTML elements (e.g., <div>, <h1>)
          return {
            ...jsx,
            props: renderJSXToClientJSX(jsx.props),
            key: key ?? jsx.key,
          };
        } else if (typeof jsx.type === "function") {
          const Component = jsx.type;
          const props = jsx.props;
          if (isClientComponent(Component)) {
            return {
              $$typeof: Symbol.for("react.transitional.element"),
              type: Component,
              props: renderJSXToClientJSX(props),
              key: key ?? jsx.key,
            };
          } else {
            // Server component: execute and process
            const returnedJsx = Component(props);
            // if (returnedJsx instanceof Promise) {
            //   console.warn(`Server Component returned a Promise`);
            //   return returnedJsx.then((resolvedJsx) =>
            //     renderJSXToClientJSX(resolvedJsx, key ?? jsx.key)
            //   );
            // }
            return renderJSXToClientJSX(returnedJsx, key ?? jsx.key);
          }
        } else {
          console.error("Unsupported JSX type:", jsx.type);
          throw new Error("Unsupported JSX type");
        }
      } else if (jsx instanceof Promise) {
        console.warn("Received a Promise in JSX", jsx);
        // return await renderJSXToClientJSX(await jsx, key);
        // return jsx.then((resolvedJsx) =>
        //   renderJSXToClientJSX(resolvedJsx, key)
        // );
        return jsx;
      } else {
        // Process object props (e.g., { className: "foo" })
        return Object.fromEntries(
          // Promise.all(
          Object.entries(jsx).map(([propName, value]) => [
            propName,
            renderJSXToClientJSX(value),
          ])
          // )
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

      // const clientJsx = renderJSXToClientJSX(
      //   React.createElement(React.Suspense, {
      //     fallback: undefined, //React.createElement("div", null, "Loading..."),
      //     children: renderJSXToClientJSX(
      //       React.createElement("div", {
      //         children: React.createElement(App, { params }),
      //       })
      //     ),
      //   })
      // );
      // const clientJsx = renderJSXToClientJSX(
      //   React.createElement(React.Suspense, {
      //     fallback: undefined, //React.createElement("div", null, "Loading..."),
      //     children: React.createElement("div", {
      //       children: React.createElement(App, { params }),
      //       ____rendertopipeablestreamfix____: "true", // Example of adding a custom prop
      //     }),
      //   })
      // );

      // console.log("Client JSX:", clientJsx);
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
          stream
            // .pipe(new RemoveWrapperDivTransform())
            .pipe(process.stdout);
        },
        bootstrapScripts: ["/main.js"],
        // bootstrapModules: [],
        // progressiveChunkSize: 0,
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
