# Project ready to develop with React 19 (Typescript or Javascript) with SSR and multi-page file based routing

This project can be created with **`npx create-react19-app@latest my-app`**.

This is a project ready to develop with **React 19**. Specifically with Server Functions and `Suspense`.

This project is ready to develop either in **Typescript** or **Javascript**. If a `page.tsx` is found in a route folder, then it will take preference over a possible `page.jsx` or `page.js`. **There must be at least a `page.tsx` or `page.jsx` (or `page.js`) in a route folder**.

With this project, you can build multi-page apps with file based routing and SSR. If you want a SPA (Single Page Application) without SSR then use the command above with the `--nossr` option: `npx create-react19-app@latest --nossr my-app`, and it will create a project like [this one](https://github.com/roggc/react19) instead.

## The `src` folder

The multi-page app is developed in the `src` folder.

### `page.tsx` (or `.jsx`, or `.js`) file

There must be a `page.tsx` (or `.jsx`, or `.js`) file in each route folder. The `src/` folder corresponds to the root route (`localhost:3000` or `localhost:3000/`). If you create a `src/route-1` folder with a `page.tsx` file in it, then you can access it from the browser with `localhost:3000/route-1` or `localhost:3000/route-1/`. And so on. For example a `src/route-1/route-x` with a `page.tsx` (or `.jsx`, or `.js`) file in it, can be accessed from the browser with `localhost:3000/route-1/route-x` (or with an ending slash).

### `layout.tsx` (or `.jsx`, or `.js`) file

The `layout` file is optional in any route folder (even the root route folder, `src/`). If found, the composition of them will wrap the `page` component of the route. They are composed from `src/` folder to route folder. That is, if route folder is `src/route-1/route-x/`, then `layout.tsx` from `src/` folder, if exists, will wrap component defined in `layout.tsx` file of `src/route-1`, if exists, and this last will wrap component defined in `layout.tsx` file of `src/route-1/route-x/`, if exists, and finally, the result of them will wrap component defined in `page.tsx` file from route folder.

### `no_layout` file (without extension)

The `no_layout` file (without extension), if present in a route folder, will not apply any `layout` to the `page` component of this route.

### `not_found.tsx` (or `.jsx`, or `.js`) file

The `not_found.tsx` file in a route defines a page for this route and nested routes for when there is no `page.tsx` file in the route requested by the Client. When there are more than one `not_found.tsx` files in the path to the requested route, the nearest to the requested path (the more nested one) will be used.

### `no_layout_not_found` file (without extension)

The `not_found.tsx` file defines a component which by default uses the applicable layouts. If you don't want to use any layout for a specific `not_found.tsx` file, then define a `no_layout_not_found` file (without extension) in the same folder the specific `not_found.tsx` file is defined.

## `page` Params

You can pass params to the routes: `localhost:3000/route-1?foo=bar`. Then in your `page.tsx` you do:

```typescript
// src/route-1/page.tsx
"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return <div>{params.foo}</div>;
}
```

So data can be passed between pages through query params in the `href` attribute of the anchor tag (`<a>`):

```typescript
// src/page.tsx
export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <>
      <a href="/route-1?foo=bar">go to route1</a>
    </>
  );
}
```

To navigate programmatically between pages you do:

```typescript
// src/route/page.tsx
"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const handleNavigate = () => {
    window.location.assign("/route-2?foo=bar");
  };

  return (
    <div>
      <button onClick={handleNavigate}>Go to /route-2</button>
    </div>
  );
}
```

## About whether to use a Server Component or not

If you do:

```typescript
// src/page.tsx

export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 8000));

  return <>{/* content */}</>;
}
```

This is terrible (at least in this implementation in its current version), because content will not show until 8 seconds, so for 8 seconds the user will see a blank screen in the page. So the technique to fetch data in the function body of a Server Component must be avoided if not necessary because it increases a lot the First Contentful Paint (FCP), that is, when the user sees something.

Then if you do not fetch data in a Server Component the utility of it is doubtful. You can opt in for a Client component instead:

```typescript
// src/page.tsx
"use client";

export default function Page() {
  // logic
  return <>{/* content */}</>;
}
```

and use Server Functions and `Suspense` to fetch data from the Server:

```typescript
<Suspense fallback="Loading...">{serverFunction()}</Suspense>
```

where `serverFunction` is:

```typescript
"use server";

export default async function () {
  return await new Promise<string>((res) =>
    setTimeout(() => res("Done"), 2000)
  );
}
```

The only reason for what it would be necessary to fetch data in the function body of a Server Component would be if this data is necessary for SEO purposes. But as I say, it blocks the rendering of the page for a certain amount of time.

## The `setup` folder

The `setup` folder has the `server.js`, `client.jsx`, and `render-html.js` files (and also the `get-jsx.js` utility file).

The `server.js` file is the starting point of the app. It is executed by `node`. It defines an endpoint with a regex (regular expression) to capture all the `get` requests made to the app. Its purpose is to serve the rendered html to the Client (SSR). The rendered html is obtained in a subprocess (`render-html.js`). The reason why the server side rendering to html of the document is done in a separate process it's because incompatibilities of use of the `renderToPipeableStream` API from `react-dom/server` in a Server Components environment.

In this rendering to html of the document in the server, Server Components must be processed first (because they are regular functions that can and should be called). So there is a utility function that does this processing and gets as a result a `JSX` that can be passed to `renderToPipeableStream` method. It's because of this that the implementation need a way to know when a component it's a Server Component or not, and that way is if they are `async` functions. So for this reason, **when you define a Server Component in this implementation use always an `async` function**, no matter if you use `await` or not.

The `server.js` file defines another endpoint, with a regular expression too. Its purpose is to serve the RSC payload to the Client for hydration.

The `client.jsx` file defines the `main.js` script, which is encharged of fetching the RSC payload from the Server and hydrate the document.

## How to run it

To start the app in development mode you must run `npm run dev`. This will execute Webpack in watch mode and will start the app with the `node` command. It uses the package `concurrently` to execute both in parallel. The server is faster to be ready than Webpack, so when executing the command wait for Webpack log to show and then you can navigate to the page you want (`localhost:3000` or `localhost:3000/the/page/you/want`).

There is no hot reloading, so when you do changes to the code, you have to reload yourself the page to see those changes.

The project has the package [react-enhanced-suspense](https://www.npmjs.com/package/react-enhanced-suspense) installed. It is an enhanced `Suspense` that works as React's `Suspense` if no extra props are used.
