require("@babel/register")({
  ignore: [/[\\\/](build|server|node_modules)[\\\/]/],
  presets: [
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});
// render-html.js
const { renderToString } = require("react-dom/server");
const React = require("react");
const path = require("path");
const { readFileSync, existsSync } = require("fs");

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
const App = appModule.default ?? appModule;

const manifestPath = path.resolve(
  process.cwd(),
  "public/react-client-manifest.json"
);
const manifest = readFileSync(manifestPath, "utf8");
const moduleMap = JSON.parse(manifest);

// Function to check if a module is a client component
// async function isClientComponent(type) {
//   console.log("isClientComponent", type?.name || "Unknown");
//   if (typeof type !== "function") {
//     console.log("isClientComponent: not a function");
//     return false;
//   }
//   // Buscar en el manifiesto cualquier módulo con chunks (indica componente cliente)
//   for await (const module of Object.values(moduleMap)) {
//     try {
//       // Cargar el módulo para comparar con type
//       // const pathx = path.resolve(process.cwd(), module.id);
//       console.log("isClientComponent: module path", module.id);
//       const module2 = await import("../" + module.id);
//       const component = module2.default || module2;
//       if (typeof component === typeof type) {
//         console.log("isClientComponent: found client component", module.id);
//         return module.chunks?.length > 0;
//       }
//     } catch (e) {
//       console.error(`Error resolviendo módulo ${module.id}:`, e);
//       return false;
//     }
//   }
//   console.log("isClientComponent: not found");
//   return false;
// }

// async function isClientComponent(type) {
//   // console.log("isClientComponent", type?.name || "Unknown");
//   if (typeof type !== "function") {
//     // console.log("isClientComponent: not a function");
//     return false;
//   }
//   // Buscar en el manifiesto cualquier módulo con chunks (indica componente cliente)
//   for (const module of Object.values(moduleMap)) {
//     // console.log("isClientComponent: checking module", module.id);
//     // Verificar si el nombre del componente coincide con el nombre del módulo
//     const moduleName = module.id
//       .split("/")
//       .pop()
//       .replace(/\.[^/.]+$/, ""); // Ejemplo: "counter" de "./src/counter.tsx"
//     if (
//       moduleName.toLowerCase() === type.name.toLowerCase() &&
//       module.chunks?.length > 0
//     ) {
//       // console.log("isClientComponent: found client component", module.id);
//       return true;
//     }
//   }
//   // console.log("isClientComponent: moduleId not found, isClient false");
//   return false;
// }

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
      if (jsx.type === Symbol.for("react.fragment")) {
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
        throw new Error("Unsupported JSX type");
      }
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

// Main function to render HTML
async function renderToHtml() {
  try {
    const clientJsx = await renderJSXToClientJSX(React.createElement(App));
    const html = renderToString(clientJsx);
    process.stdout.write(JSON.stringify({ html }));
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

renderToHtml();
