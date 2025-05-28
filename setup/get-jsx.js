const path = require("path");
const { existsSync } = require("fs");
const React = require("react");

function getJSX(folderPath, params) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  let pagePath = null;

  for (const ext of possibleExtensions) {
    const candidatePath = path.resolve(
      process.cwd(),
      `${folderPath}page${ext}`
    );
    if (existsSync(candidatePath)) {
      pagePath = candidatePath;
      break;
    }
  }

  let jsx;

  if (!pagePath) {
    let notFoundPagePath = null;

    for (const ext of possibleExtensions) {
      const candidatePath = path.resolve(
        process.cwd(),
        `${folderPath}page${ext}`
      );
      if (existsSync(candidatePath)) {
        notFoundPagePath = candidatePath;
        break;
      }
    }
    if (!notFoundPagePath) {
      jsx = React.createElement(
        "div",
        null,
        `Page not found: no "page" file found in "${folderPath}" with supported extensions (.js, .jsx, .tsx)`
      );
    }
  } else {
    const pageModule = require(pagePath);
    const Page = pageModule.default ?? pageModule;
    jsx = React.createElement(Page, { params });
  }

  if (existsSync(path.resolve(process.cwd(), `${folderPath}no_layout`))) {
    return jsx;
  }

  const layouts = getLayouts(folderPath);
  if (layouts && Array.isArray(layouts)) {
    for (const Layout of layouts) {
      jsx = React.createElement(Layout, null, jsx);
    }
  }
  return jsx;
}

function getLayouts(folderPath) {
  const splited = folderPath.split("/");
  const layoutFolderPaths = [];
  for (let i = splited.length - 2; i >= 0; i--) {
    layoutFolderPaths.push(splited.slice(0, i + 1).join("/") + "/");
  }
  const layouts = [];
  for (const layoutFolderPath of layoutFolderPaths) {
    const Layout = getLayoutFromFolder(layoutFolderPath);
    if (Layout) {
      layouts.push(Layout);
    }
  }
  return layouts;
}

function getLayoutFromFolder(folderPath) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  for (const ext of possibleExtensions) {
    const layoutPath = path.resolve(process.cwd(), `${folderPath}layout${ext}`);
    if (existsSync(layoutPath)) {
      const layoutModule = require(layoutPath);
      const Layout = layoutModule.default ?? layoutModule;
      return Layout;
    }
  }
  return null;
}

module.exports = {
  getJSX,
};
