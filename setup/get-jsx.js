const path = require("path");
const { existsSync, readdirSync } = require("fs");
const React = require("react");

function getSlots(currentPath, reqSegments, params) {
  const slots = {};
  const slotFolders = readdirSync(currentPath, {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory() && entry.name.startsWith("@"));
  for (const slot of slotFolders) {
    const [slotPath, slotParams] = getFilePathAndDynamicParams(
      reqSegments,
      params,
      path.join(currentPath, slot.name),
      "page",
      true,
      true,
      undefined,
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
  reqSegments,
  params,
  currentPath,
  fileName = "page",
  withExtension = true,
  finalDestination = true,
  lastFound = undefined,
  index = 0,
  dParams = {},
  accumulative = false,
  accumulate = [],
  possibleExtensions = [".tsx", ".jsx", ".js"],
  isGroup = false,
  isFound = { value: false }
) {
  let foundInCurrentPath;
  if (index > reqSegments.length - 1 || !finalDestination) {
    if (withExtension) {
      for (const ext of possibleExtensions) {
        const candidatePath = path.join(currentPath, `${fileName}${ext}`);
        if (existsSync(candidatePath)) {
          if (index > reqSegments.length - 1) {
            if (isGroup) isFound.value = true;
            if (!accumulative) return [candidatePath, dParams];
            const slots = getSlots(currentPath, reqSegments, params);
            accumulate.push([candidatePath, dParams, slots]);
            return accumulate;
          }
          if (accumulative) {
            const slots = getSlots(currentPath, reqSegments, params);
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
          if (isGroup) isFound.value = true;
          if (!accumulative) return [candidatePath, dParams];
          const slots = getSlots(currentPath, reqSegments, params);
          accumulate.push([candidatePath, dParams, slots]);
          return accumulate;
        }
        if (accumulative) {
          const slots = getSlots(currentPath, reqSegments, params);
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
                  if (isGroup) isFound.value = true;
                  if (accumulative) {
                    const slots = getSlots(dynamicPath, reqSegments, params);
                    accumulate.push([candidatePath, newParams, slots]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (isGroup) isFound.value = true;
                if (accumulative) {
                  const slots = getSlots(dynamicPath, reqSegments, params);
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
            if (withExtension) {
              for (const ext of possibleExtensions) {
                const candidatePath = path.join(
                  dynamicPath,
                  `${fileName}${ext}`
                );
                if (existsSync(candidatePath)) {
                  if (isGroup) isFound.value = true;
                  if (accumulative) {
                    const slots = getSlots(dynamicPath, reqSegments, params);
                    accumulate.push([candidatePath, newParams, slots]);
                    return accumulate;
                  }
                  return [candidatePath, newParams];
                }
              }
            } else {
              const candidatePath = path.join(dynamicPath, fileName);
              if (existsSync(candidatePath)) {
                if (isGroup) isFound.value = true;
                if (accumulative) {
                  const slots = getSlots(dynamicPath, reqSegments, params);
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
      reqSegments,
      params,
      staticPath,
      fileName,
      withExtension,
      finalDestination,
      finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
      index + 1,
      dParams,
      accumulative,
      accumulate,
      possibleExtensions,
      isGroup,
      isFound
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
              const candidatePath = path.join(dynamicPath, `${fileName}${ext}`);
              if (existsSync(candidatePath)) {
                if (isGroup) isFound.value = true;
                if (accumulative) {
                  const slots = getSlots(dynamicPath, reqSegments, params);
                  accumulate.push([candidatePath, newParams, slots]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
          } else {
            const candidatePath = path.join(dynamicPath, fileName);
            if (existsSync(candidatePath)) {
              if (isGroup) isFound.value = true;
              if (accumulative) {
                const slots = getSlots(dynamicPath, reqSegments, params);
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
        } else if (entry.name.startsWith("[...") && entry.name.endsWith("]")) {
          const paramName = entry.name.slice(4, -1);
          const paramValue = reqSegments.slice(index);
          const newParams = {
            ...dParams,
            [paramName]: paramValue,
          };
          const dynamicPath = path.join(currentPath, entry.name);
          if (withExtension) {
            for (const ext of possibleExtensions) {
              const candidatePath = path.join(dynamicPath, `${fileName}${ext}`);
              if (existsSync(candidatePath)) {
                if (isGroup) isFound.value = true;
                if (accumulative) {
                  const slots = getSlots(dynamicPath, reqSegments, params);
                  accumulate.push([candidatePath, newParams, slots]);
                  return accumulate;
                }
                return [candidatePath, newParams];
              }
            }
          } else {
            const candidatePath = path.join(dynamicPath, fileName);
            if (existsSync(candidatePath)) {
              if (isGroup) isFound.value = true;
              if (accumulative) {
                const slots = getSlots(dynamicPath, reqSegments, params);
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
            reqSegments,
            params,
            dynamicPath,
            fileName,
            withExtension,
            finalDestination,
            finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
            index + 1,
            newParams,
            accumulative,
            accumulate,
            possibleExtensions,
            isGroup,
            isFound
          );
        } else if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          const paramName = entry.name.slice(1, -1);
          const paramValue = reqSegments[index];
          const newParams = {
            ...dParams,
            [paramName]: paramValue,
          };
          const dynamicPath = path.join(currentPath, entry.name);
          return getFilePathAndDynamicParams(
            reqSegments,
            params,
            dynamicPath,
            fileName,
            withExtension,
            finalDestination,
            finalDestination ? lastFound : foundInCurrentPath ?? lastFound,
            index + 1,
            newParams,
            accumulative,
            accumulate,
            possibleExtensions,
            isGroup,
            isFound
          );
        } else if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
          const groupPath = path.join(currentPath, entry.name);
          const newIsFound = { value: false };
          const result = getFilePathAndDynamicParams(
            reqSegments,
            params,
            groupPath,
            fileName,
            withExtension,
            finalDestination,
            lastFound,
            index,
            dParams,
            accumulative,
            accumulate,
            possibleExtensions,
            true,
            newIsFound
          );
          if (newIsFound.value) {
            if (isGroup) isFound.value = true;
            return result;
          }
        }
      }
    }
    if (!accumulative)
      return finalDestination ? [] : [foundInCurrentPath ?? lastFound, dParams];
    return accumulate;
  }
}

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

  if (!pagePath) {
    const [filePath, dParams] = getFilePathAndDynamicParams(
      reqSegments,
      params,
      srcFolder
    );
    pagePath = filePath;
    dynamicParams = dParams ?? {};
  }

  let jsx;

  if (!pagePath) {
    const [notFoundPath, dParams] = getFilePathAndDynamicParams(
      reqSegments,
      params,
      srcFolder,
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

  if (
    getFilePathAndDynamicParams(
      reqSegments,
      params,
      srcFolder,
      "no_layout",
      false
    )[0]
  ) {
    return jsx;
  }

  const layouts = getFilePathAndDynamicParams(
    reqSegments,
    params,
    srcFolder,
    "layout",
    true,
    false,
    undefined,
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

module.exports = {
  getJSX,
};
