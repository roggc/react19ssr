// render-html.js
const { renderToString } = require("react-dom/server");
const React = require("react");

// Load app component dynamically
const appPath = process.argv[2]; // Passed from parent
const App = require(appPath).default;

// Function to convert RSCs to client JSX
async function renderJSXToClientJSX(jsx, key = null) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
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
  } else if (typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (jsx.type === Symbol.for("react.fragment")) {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
          key: key ?? jsx.key,
        };
      } else if (typeof jsx.type === "string") {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
          key: key ?? jsx.key,
        };
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type;
        const props = jsx.props;
        if (Object.keys(props).some((k) => k === "__isClient__")) {
          return {
            ...jsx,
            type: { file: jsx.props.__isClient__ },
            props: await renderJSXToClientJSX(
              Object.fromEntries(
                Object.entries(jsx.props).filter(
                  ([key]) => key !== "__isClient__"
                )
              )
            ),
            key: key ?? jsx.key,
          };
        } else {
          const returnedJsx = await Component(props);
          return await renderJSXToClientJSX(returnedJsx);
        }
      } else {
        throw new Error("Not implemented.");
      }
    } else {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) =>
            typeof value === "function"
              ? [propName, await renderJSXToClientJSX(null)]
              : [propName, await renderJSXToClientJSX(value)]
          )
        )
      );
    }
  } else throw new Error("Not implemented");
}

// Main function to render HTML
async function renderToHtml() {
  try {
    const clientJsx = await renderJSXToClientJSX(<App />);
    const html = renderToString(clientJsx);
    process.stdout.write(JSON.stringify({ html })); // Send to parent
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

renderToHtml();
