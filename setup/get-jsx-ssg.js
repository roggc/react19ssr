const path = require("path");
const { existsSync, readdirSync, mkdirSync, writeFileSync } = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

function getJSX(reqPath, params) {
  const possibleExtensions = [".tsx", ".jsx", ".js"];
  const srcFolder = path.resolve(process.cwd(), "src");
  const distFolder = path.resolve(process.cwd(), "dist");
  const reqSegments = reqPath.split("/").filter(Boolean);

  // Verificar si existe una página estática pre-renderizada
  const staticPath = path.join(distFolder, reqPath, "index.json");
  if (existsSync(staticPath)) {
    const { jsx, params: staticParams } = require(staticPath);
    return React.createElement(jsx.type, {
      ...jsx.props,
      params: { ...staticParams, ...params },
    });
  }

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
  function getSlots(currentPath) {
    const slots = {};
    const slotFolders = readdirSync(currentPath, {
      withFileTypes: true,
    }).filter((entry) => entry.isDirectory() && entry.name.startsWith("@"));
    for (const slot of slotFolders) {
      const [slotPath, slotParams] = getFilePathAndDynamicParams(
        "page",
        true,
        true,
        undefined,
        path.join(currentPath, slot.name),
        reqSegments.length
      );
      if (slotPath) {
        const slotModule = require(slotPath);
        const Slot = slotModule.default ?? slotModule;
        slots[slot.name.slice(1)] = React.createElement(Slot, {
          params: { ...slotParams, ...params },
        });
      }
    }
    return slots;
  }
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
              const slots = getSlots(currentPath);
              accumulate.push([candidatePath, dParams, slots]);
              return accumulate;
            }
            if (accumulative) {
              const slots = getSlots(currentPath);
              accumulate.push([candidatePath, dParams, slots]);
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
            const slots = getSlots(currentPath);
            accumulate.push([candidatePath, dParams, slots]);
            return accumulate;
          }
          if (accumulative) {
            const slots = getSlots(currentPath);
            accumulate.push([candidatePath, dParams, slots]);
          } else {
            foundInCurrentPath = candidatePath;
          }
        }
      }
      if (index > reqSegments.length - 1) {
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
                      const slots = getSlots(dynamicPath);
                      accumulate.push([candidatePath, newParams, slots]);
                      return accumulate;
                    }
                    return [candidatePath, newParams];
                  }
                }
              } else {
                const candidatePath = path.join(dynamicPath, fileName);
                if (existsSync(candidatePath)) {
                  if (accumulative) {
                    const slots = getSlots(dynamicPath);
                    accumulate.push([candidatePath, newParams, slots]);
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
              entry.name.startsWith("[[") &&
              entry.name.endsWith("]]")
            ) {
              const paramName = entry.name.slice(2, -2);
              const paramValue =
                index < reqSegments.length ? reqSegments[index] : undefined;
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
                      const slots = getSlots(dynamicPath);
                      accumulate.push([candidatePath, newParams, slots]);
                      return accumulate;
                    }
                    return [candidatePath, newParams];
                  }
                }
              } else {
                const candidatePath = path.join(dynamicPath, fileName);
                if (existsSync(candidatePath)) {
                  if (accumulative) {
                    const slots = getSlots(dynamicPath);
                    accumulate.push([candidatePath, newParams, slots]);
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
                    const slots = getSlots(dynamicPath);
                    accumulate.push([candidatePath, newParams, slots]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (accumulative) {
                  const slots = getSlots(dynamicPath);
                  accumulate.push([candidatePath, newParams, slots]);
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
                    const slots = getSlots(dynamicPath);
                    accumulate.push([candidatePath, newParams, slots]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (accumulative) {
                  const slots = getSlots(dynamicPath);
                  accumulate.push([candidatePath, newParams, slots]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
            if (accumulative) return accumulate;
            return finalDestination
              ? []
              : [foundInCurrentPath ?? lastFound, newParams];
          } else if (entry.name.startsWith("[[") && entry.name.endsWith("]]")) {
            const paramName = entry.name.slice(2, -2);
            const paramValue =
              index < reqSegments.length ? reqSegments[index] : undefined;
            const newParams = {
              ...dParams,
              [paramName]: paramValue,
            };
            const dynamicPath = path.join(currentPath, entry.name);
            return getFilePathAndDynamicParams(
              fileName,
              withExtension,
              finalDestination,
              finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
              dynamicPath,
              index + 1,
              newParams,
              accumulative,
              accumulate
            );
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
          } else if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
            const groupPath = path.join(currentPath, entry.name);
            return getFilePathAndDynamicParams(
              fileName,
              withExtension,
              finalDestination,
              lastFound,
              groupPath,
              index,
              dParams,
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
        "div",
        null,
        `Page not found: no "page" file found for "${reqPath}"`
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
    for (const [layoutPath, dParams, slots] of layouts.reverse()) {
      const pageModule = require(layoutPath);
      const Page = pageModule.default ?? pageModule;
      jsx = React.createElement(
        Page,
        { params: { ...dParams, ...params }, ...slots },
        jsx
      );
    }
  }

  return jsx;
}

// Función para construir páginas estáticas (build)
function buildStaticSite() {
  const srcFolder = path.resolve(process.cwd(), "src");
  const distFolder = path.resolve(process.cwd(), "dist");
  if (!existsSync(distFolder)) {
    mkdirSync(distFolder, { recursive: true });
  }

  function collectPages(currentPath, segments = []) {
    const entries = readdirSync(currentPath, { withFileTypes: true });
    const pages = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
          // Grupos de rutas: no incluir en la URL
          pages.push(
            ...collectPages(path.join(currentPath, entry.name), segments)
          );
        } else if (
          entry.name.startsWith("[[...") &&
          entry.name.endsWith("]]")
        ) {
          // Optional catch-all
          const paramName = entry.name.slice(5, -2);
          const dynamicPath = path.join(currentPath, entry.name);
          const pagePath = path.join(dynamicPath, "page.tsx");
          if (existsSync(pagePath)) {
            pages.push({
              path: dynamicPath,
              segments,
              params: { [paramName]: [] },
            });
          }
        } else if (entry.name.startsWith("[...") && entry.name.endsWith("]")) {
          // Catch-all: necesita getStaticPaths
          const paramName = entry.name.slice(4, -1);
          const dynamicPath = path.join(currentPath, entry.name);
          const pagePath = path.join(dynamicPath, "page.tsx");
          if (existsSync(pagePath)) {
            const module = require(pagePath);
            if (module.getStaticPaths) {
              const paths = module.getStaticPaths();
              for (const path of paths) {
                pages.push({
                  path: dynamicPath,
                  segments: [...segments, ...path],
                  params: { [paramName]: path },
                });
              }
            }
          }
        } else if (entry.name.startsWith("[[") && entry.name.endsWith("]]")) {
          // Optional dynamic param
          const paramName = entry.name.slice(2, -2);
          const dynamicPath = path.join(currentPath, entry.name);
          const pagePath = path.join(dynamicPath, "page.tsx");
          if (existsSync(pagePath)) {
            pages.push({
              path: dynamicPath,
              segments,
              params: { [paramName]: undefined },
            });
            // También incluir con valores posibles si hay getStaticPaths
            const module = require(pagePath);
            if (module.getStaticPaths) {
              const paths = module.getStaticPaths();
              for (const path of paths) {
                pages.push({
                  path: dynamicPath,
                  segments: [...segments, path],
                  params: { [paramName]: path },
                });
              }
            }
          }
        } else if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          // Dynamic param: necesita getStaticPaths
          const paramName = entry.name.slice(1, -1);
          const dynamicPath = path.join(currentPath, entry.name);
          const pagePath = path.join(dynamicPath, "page.tsx");
          if (existsSync(pagePath)) {
            const module = require(pagePath);
            if (module.getStaticPaths) {
              const paths = module.getStaticPaths();
              for (const path of paths) {
                pages.push({
                  path: dynamicPath,
                  segments: [...segments, path],
                  params: { [paramName]: path },
                });
              }
            }
          }
        } else if (!entry.name.startsWithWith("@")) {
          // Carpetas estáticas y no slots
          pages.push(
            ...collectPages(path.join(currentPath, entry.name), [
              ...segments,
              entry.name,
            ])
          );
        }
      }
    }

    // Verificar page.tsx en la carpeta actual
    const pagePath = path.join(currentPath, "page.tsx");
    if (existsSync(pagePath)) {
      pages.push({ path: currentPath, segments, params: {} });
    }

    return pages;
  }

  const pages = collectPages(srcFolder);

  for (const { path, segments, params } of pages) {
    const pageModule = require(path.join(path, "page.tsx"));
    const Page = pageModule.default ?? pageModule;
    let props = { params };

    // Ejecutar getStaticProps si existe
    if (pageModule.getStaticProps) {
      const { props: staticProps } = pageModule.getStaticProps({ params });
      props = { ...props, ...staticProps };
    }

    // Obtener layouts y slots
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

    let jsx = React.createElement(Page, props);

    if (layouts && Array.isArray(layouts)) {
      for (const [layoutPath, dParams, slots] of layouts.reverse()) {
        const layoutModule = require(layoutPath);
        const Layout = layoutModule.default ?? layoutModule;
        jsx = React.createElement(
          Layout,
          { params: { ...dParams, ...params }, ...slots },
          jsx
        );
      }
    }

    // Renderizar a string para verificar
    const html = ReactDOMServer.renderToString(jsx);

    // Guardar como JSON en dist/
    const outputPath = path.join(distFolder, segments.join("/"));
    mkdirSync(outputPath, { recursive: true });
    writeFileSync(
      path.join(outputPath, "index.json"),
      JSON.stringify({ jsx: serializeReactElement(jsx), params })
    );
  }

  console.log(`Static site generated with ${pages.length} pages`);
}

// Función para serializar React elements (simplificada)
function serializeReactElement(element) {
  return {
    type: element.type.name || element.type,
    props: {
      ...element.props,
      children: Array.isArray(element.props.children)
        ? element.props.children.map(serializeReactElement)
        : element.props.children
        ? serializeReactElement(element.props.children)
        : undefined,
    },
  };
}

module.exports = {
  getJSX,
  buildStaticSite,
};
