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
const getJSX = require("./get-jsx").getJSX;

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

function renderJSXToClientJSX(jsx, key = null) {
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
    return jsx.map((child, i) =>
      renderJSXToClientJSX(
        child,
        i + (typeof child?.type === "string" ? "_" + child?.type : "")
      )
    );
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
      if (jsx.type === Symbol.for("react.fragment")) {
        return {
          ...jsx,
          props: renderJSXToClientJSX(jsx.props),
          key: key ?? jsx.key,
        };
      } else if (jsx.type === Symbol.for("react.suspense")) {
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
          return renderJSXToClientJSX(returnedJsx, key ?? jsx.key);
        }
      } else {
        console.error("Unsupported JSX type:", jsx.type);
        throw new Error("Unsupported JSX type");
      }
    } else if (jsx instanceof Promise) {
      return jsx;
    } else {
      // Process object props (e.g., { className: "foo" })
      return Object.fromEntries(
        Object.entries(jsx).map(([propName, value]) => [
          propName,
          renderJSXToClientJSX(value),
        ])
      );
    }
  } else {
    throw new Error("Not implemented");
  }
}

// Render the app to a stream
function renderToStream() {
  try {
    const folderPath = process.argv[2];
    const params = JSON.parse(process.argv[3]);
    let jsx;
    try {
      jsx = getJSX(folderPath, params);
    } catch (error) {
      const stream = renderToPipeableStream(
        React.createElement("div", null, error.message),
        {
          onError(error) {
            console.error("Render error:", error);
            process.stderr.write(JSON.stringify({ error: error.message }));
          },
          onShellReady() {
            stream.pipe(process.stdout);
          },
        }
      );
      return;
    }

    const clientJsx = renderJSXToClientJSX(jsx);

    const stream = renderToPipeableStream(clientJsx, {
      onError(error) {
        console.error("Render error:", error);
        process.stderr.write(JSON.stringify({ error: error.message }));
      },
      onShellReady() {
        stream.pipe(process.stdout);
      },
      bootstrapScripts: ["/main.js"],
    });
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

try {
  renderToStream();
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error.message }));
  process.exit(1);
}
