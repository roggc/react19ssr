const { renderToPipeableStream } = require("react-dom/server");
const React = require("react");

function renderToStream(Component) {
  const stream = renderToPipeableStream(
    React.createElement(
      Component,
      null,
      React.createElement(
        React.Suspense,
        null,
        new Promise((resolve) => setTimeout(resolve, 4000))
      )
    ),
    {
      onShellReady() {
        stream.pipe(process.stdout);
      },
    }
  );
}

renderToStream("div"); // OK
renderToStream(React.Fragment); // NOT OK
