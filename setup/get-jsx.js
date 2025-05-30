const path = require("path");
const { existsSync, readdirSync } = require("fs");
const React = require("react");

function getJSX(reqPath, params) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  const srcFolder = path.resolve(process.cwd(), "src");
  const reqSegments = reqPath.split("/").filter(Boolean);

  function findPage(currentPath, reqSegments, index = 0, dynamicParams = {}) {
    if (index >= reqSegments.length) {
      for (const ext of possibleExtensions) {
        const candidatePath = path.join(currentPath, `page${ext}`);
        if (existsSync(candidatePath)) {
          return { pagePath: candidatePath, params: dynamicParams };
        }
      }
      return null;
    }

    const reqSegment = reqSegments[index];
    const entries = readdirSync(currentPath, { withFileTypes: true });

    // Intentar con carpeta estática
    const staticPath = path.join(currentPath, reqSegment);
    if (existsSync(staticPath)) {
      const result = findPage(
        staticPath,
        reqSegments,
        index + 1,
        dynamicParams
      );
      if (result) return result;
    }

    // Intentar con carpeta dinámica ([param])
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name.startsWith("[") &&
        entry.name.endsWith("]")
      ) {
        const paramName = entry.name.slice(1, -1);
        const newParams = { ...dynamicParams, [paramName]: reqSegment };
        const dynamicPath = path.join(currentPath, entry.name);
        const result = findPage(dynamicPath, reqSegments, index + 1, newParams);
        if (result) return result;
      }
    }

    return null;
  }

  function findNoLayout(currentPath, reqSegments, index = 0) {
    if (index >= reqSegments.length) {
      const noLayoutPath = path.join(currentPath, "no_layout");
      if (existsSync(noLayoutPath)) {
        return true;
      }
      return false;
    }

    const reqSegment = reqSegments[index];
    const entries = readdirSync(currentPath, { withFileTypes: true });

    // Intentar con carpeta estática
    const staticPath = path.join(currentPath, reqSegment);
    if (existsSync(staticPath)) {
      const result = findNoLayout(staticPath, reqSegments, index + 1);
      if (result) return result;
    }

    // Intentar con carpeta dinámica ([param])
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name.startsWith("[") &&
        entry.name.endsWith("]")
      ) {
        const dynamicPath = path.join(currentPath, entry.name);
        const result = findNoLayout(dynamicPath, reqSegments, index + 1);
        if (result) return result;
      }
    }

    return false;
  }

  let jsx;

  const route = findPage(srcFolder, reqSegments, 0, params);
  if (!route) {
    const { NotFoundPage, notFoundPageFolderPath } = getNotFoundPage(
      srcFolder,
      reqSegments
    );
    if (!NotFoundPage) {
      jsx = React.createElement(
        "html",
        null,
        React.createElement(
          "head",
          null,
          React.createElement("title", null, "404 - Not Found")
        ),
        React.createElement(
          "body",
          null,
          React.createElement(
            "div",
            null,
            `Page not found: no "page" file found for "${reqPath}"`
          )
        )
      );
    } else {
      jsx = React.createElement(NotFoundPage, { params });
      if (
        existsSync(
          path.resolve(
            process.cwd(),
            `${notFoundPageFolderPath}no_layout_not_found`
          )
        )
      ) {
        return jsx;
      }
    }
  } else {
    const { pagePath, params: dynamicParams } = route;
    const pageModule = require(pagePath);
    const Page = pageModule.default ?? pageModule;
    jsx = React.createElement(Page, {
      params: { ...dynamicParams, ...params },
    });
  }

  if (findNoLayout(srcFolder, reqSegments)) {
    return jsx;
  }

  const layouts = getLayouts(srcFolder, reqSegments);
  console.warn("layouts.length", layouts.length, reqSegments);
  if (layouts && Array.isArray(layouts)) {
    for (const { Layout, dynamicParams } of layouts) {
      jsx = React.createElement(
        Layout,
        { params: { ...dynamicParams, ...params } },
        jsx
      );
    }
  }

  return jsx;
}

function getNotFoundPage(srcFolder, reqSegments) {
  function findNotFound(currentPath, reqSegments, index = 0) {
    if (index >= reqSegments.length) {
      const notFoundPage = getNotFoundPageFromFolder(currentPath);
      if (notFoundPage) {
        return {
          NotFoundPage: notFoundPage,
          notFoundPageFolderPath: path.join(currentPath, "/"),
        };
      }
      return null;
    }

    const reqSegment = reqSegments[index];
    const staticPath = path.join(currentPath, reqSegment);

    if (existsSync(staticPath)) {
      const result = findNotFound(staticPath, reqSegments, index + 1);
      if (result) return result;
    }

    const entries = readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name.startsWith("[") &&
        entry.name.endsWith("]")
      ) {
        const dynamicPath = path.join(currentPath, entry.name);
        const result = findNotFound(dynamicPath, reqSegments, index + 1);
        if (result) return result;
      }
    }

    return null;
  }

  const result = findNotFound(srcFolder, reqSegments);
  return result ?? {};
}

function getNotFoundPageFromFolder(folderPath) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  for (const ext of possibleExtensions) {
    const notFoundPath = path.join(folderPath, `not_found${ext}`);
    if (existsSync(notFoundPath)) {
      const notFoundModule = require(notFoundPath);
      const NotFound = notFoundModule.default ?? notFoundModule;
      return NotFound;
    }
  }
  return null;
}

function getLayouts(srcFolder, reqSegments, queryParams) {
  function findLayouts(
    reqSegments,
    index = 0,
    layouts = [],
    dynamicParams = {}
  ) {
    console.warn("findLayouts");
    if (index === -1) {
      const layout = getLayoutFromFolder(srcFolder);
      if (layout) layouts.push({ Layout: layout, dynamicParams: {} });
      return layouts;
    }

    const folderPath = path.join(srcFolder, ...reqSegments.slice(0, index + 1));
    console.warn("folderPath", folderPath);
    if (existsSync(folderPath)) {
      const layout = getLayoutFromFolder(folderPath);
      if (layout) layouts.push({ Layout: layout, dynamicParams });
      return findLayouts(reqSegments, index - 1, layouts, dynamicParams);
    }
    console.warn("going to read dir");
    const entry = readdirSync(folderPath, { withFileTypes: true }).slice(-1)[0];
    console.warn("entry", entry);
    if (
      entry.isDirectory() &&
      entry.name.startsWith("[") &&
      entry.name.endsWith("]")
    ) {
      const paramName = entry.name.slice(1, -1);
      const paramValue = reqSegments[index] ?? "";
      const newParams = { ...dynamicParams, [paramName]: paramValue };
      const layout = getLayoutFromFolder(folderPath);
      if (layout) layouts.push({ Layout: layout, dynamicParams: newParams });
      return findLayouts(reqSegments, index - 1, layouts, newParams);
    }

    return layouts;
  }

  return findLayouts(reqSegments, reqSegments.length - 1);
}

function getLayoutFromFolder(folderPath) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  for (const ext of possibleExtensions) {
    const layoutPath = path.join(folderPath, `layout${ext}`);
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
