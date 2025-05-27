const path = require("path");
const { existsSync } = require("fs");

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
  getLayouts,
};
