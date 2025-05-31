const path = require("path");
const { existsSync, readdirSync } = require("fs");
const React = require("react");

function getJSX(reqPath, params) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  const srcFolder = path.resolve(process.cwd(), "src");
  const reqSegments = reqPath.split("/").filter(Boolean);

  const folderPath = path.join(srcFolder, ...reqSegments);
  let pagePath;
  if (existsSync(folderPath)) {
    for (const ext of possibleExtensions) {
      const candidatePath = path.join(folderPath, `page${ext}`);
      if (existsSync(candidatePath)) {
        pagePath = candidatePath;
      }
    }
  }
  let dynamicParams;
  function getFilePathAndDynamicParams(
    fileName = "page",
    withExtension = true,
    finalDestination = true,
    lastFound = undefined,
    currentPath = srcFolder,
    index = 0,
    dParams = {},
    accumulative = false,
    accumulate = []
  ) {
    let foundInCurrentPath;
    if (index > reqSegments.length - 1 || !finalDestination) {
      if (withExtension) {
        for (const ext of possibleExtensions) {
          const candidatePath = path.join(currentPath, `${fileName}${ext}`);
          if (existsSync(candidatePath)) {
            if (index > reqSegments.length - 1) {
              if (!accumulative) return [candidatePath, dParams];
              accumulate.push([candidatePath, dParams]);
              return accumulate;
            }
            if (accumulative) {
              accumulate.push([candidatePath, dParams]);
            } else {
              foundInCurrentPath = candidatePath;
            }
          }
        }
      } else {
        const candidatePath = path.join(currentPath, fileName);
        if (existsSync(candidatePath)) {
          if (index > reqSegments.length - 1) {
            if (!accumulative) return [candidatePath, dParams];
            accumulate.push([candidatePath, dParams]);
            return accumulate;
          }
          if (accumulative) {
            accumulate.push([candidatePath, dParams]);
          } else {
            foundInCurrentPath = candidatePath;
          }
        }
      }
      if (index > reqSegments.length - 1) {
        const entries = readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            entry.name.startsWith("[[...") &&
            entry.name.endsWith("]]")
          ) {
            const paramName = entry.name.slice(5, -2);
            const paramValue =
              index < reqSegments.length ? reqSegments.slice(index) : [];
            const newParams = {
              ...dParams,
              [paramName]: paramValue,
            };
            const dynamicPath = path.join(currentPath, entry.name);
            if (withExtension) {
              for (const ext of possibleExtensions) {
                const candidatePath = path.join(
                  dynamicPath,
                  `${fileName}${ext}`
                );
                if (existsSync(candidatePath)) {
                  if (accumulative) {
                    accumulate.push([candidatePath, newParams]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (accumulative) {
                  accumulate.push([candidatePath, newParams]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
            if (accumulative) return accumulate;
            return finalDestination
              ? []
              : [foundInCurrentPath ?? lastFound, newParams];
          }
        }
        if (!accumulative) return finalDestination ? [] : [lastFound, dParams];
        return accumulate;
      }
    }
    const staticPath = path.join(currentPath, reqSegments[index]);
    if (existsSync(staticPath)) {
      return getFilePathAndDynamicParams(
        fileName,
        withExtension,
        finalDestination,
        finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
        staticPath,
        index + 1,
        dParams,
        accumulative,
        accumulate
      );
    } else {
      const entries = readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name.startsWith("[[...") && entry.name.endsWith("]]")) {
            const paramName = entry.name.slice(5, -2);
            const paramValue =
              index < reqSegments.length ? reqSegments.slice(index) : [];
            const newParams = {
              ...dParams,
              [paramName]: paramValue,
            };
            const dynamicPath = path.join(currentPath, entry.name);
            if (withExtension) {
              for (const ext of possibleExtensions) {
                const candidatePath = path.join(
                  dynamicPath,
                  `${fileName}${ext}`
                );
                if (existsSync(candidatePath)) {
                  if (accumulative) {
                    accumulate.push([candidatePath, newParams]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (accumulative) {
                  accumulate.push([candidatePath, newParams]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
            if (accumulative) return accumulate;
            return finalDestination
              ? []
              : [foundInCurrentPath ?? lastFound, newParams];
          } else if (
            entry.name.startsWith("[...") &&
            entry.name.endsWith("]")
          ) {
            const paramName = entry.name.slice(4, -1);
            const paramValue = reqSegments.slice(index);
            const newParams = {
              ...dParams,
              [paramName]: paramValue,
            };
            const dynamicPath = path.join(currentPath, entry.name);
            if (withExtension) {
              for (const ext of possibleExtensions) {
                const candidatePath = path.join(
                  dynamicPath,
                  `${fileName}${ext}`
                );
                if (existsSync(candidatePath)) {
                  if (accumulative) {
                    accumulate.push([candidatePath, newParams]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (accumulative) {
                  accumulate.push([candidatePath, newParams]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
            if (accumulative) return accumulate;
            return finalDestination
              ? []
              : [foundInCurrentPath ?? lastFound, newParams];
          } else if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
            const paramName = entry.name.slice(1, -1);
            const paramValue = reqSegments[index];
            const newParams = {
              ...dParams,
              [paramName]: paramValue,
            };
            return getFilePathAndDynamicParams(
              fileName,
              withExtension,
              finalDestination,
              finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
              path.join(currentPath, entry.name),
              index + 1,
              newParams,
              accumulative,
              accumulate
            );
          }
        }
      }
      if (!accumulative)
        return finalDestination
          ? []
          : [foundInCurrentPath ?? lastFound, dParams];
      return accumulate;
    }
  }
  if (!pagePath) {
    const [filePath, dParams] = getFilePathAndDynamicParams();
    pagePath = filePath;
    dynamicParams = dParams ?? {};
  }

  let jsx;

  if (!pagePath) {
    const [notFoundPath, dParams] = getFilePathAndDynamicParams(
      "not_found",
      true,
      false
    );
    if (!notFoundPath) {
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
      const pageModule = require(notFoundPath);
      const Page = pageModule.default ?? pageModule;
      jsx = React.createElement(Page, {
        params: { ...(dParams ?? {}), ...params },
      });
      if (
        existsSync(
          path.resolve(process.cwd(), `${notFoundPath}no_layout_not_found`)
        )
      ) {
        return jsx;
      }
    }
  } else {
    const pageModule = require(pagePath);
    const Page = pageModule.default ?? pageModule;
    jsx = React.createElement(Page, {
      params: { ...dynamicParams, ...params },
    });
  }

  if (getFilePathAndDynamicParams("no_layout", false)[0]) {
    return jsx;
  }

  const layouts = getFilePathAndDynamicParams(
    "layout",
    true,
    false,
    undefined,
    srcFolder,
    0,
    {},
    true
  );

  if (layouts && Array.isArray(layouts)) {
    for (const [layoutPath, dParams] of layouts.reverse()) {
      const pageModule = require(layoutPath);
      const Page = pageModule.default ?? pageModule;
      jsx = React.createElement(
        Page,
        { params: { ...dParams, ...params } },
        jsx
      );
    }
  }

  return jsx;
}

module.exports = {
  getJSX,
};
