# Project ready to develop with React 19 (Typescript or Javascript) with SSR and multi-page file based routing

This project can be created with **`npx create-react19-app@latest --ssr my-app`**.

This is a project ready to develop with **React 19**. Specifically with Server Components, Client Components, and Server Functions.

This project is ready to develop either in **Typescript** or **Javascript**. If a `page.tsx` is found in a route folder, then it will take preference over a possible `page.jsx` or `page.js`. There must be at least a `page.tsx` or `page.jsx` (or `page.js`) in a route folder.

With this project, you can build multi-page apps with file based routing, and with SSR. If you want a SPA without SSR then use the command above without the `--ssr` option: `npx create-react19-app@latest my-app`, and it will create a project like [this one](https://github.com/roggc/react19) instead.

The multi-page app is developed in the `src` folder. There must be a `page.tsx` (or `.jsx`, or `.js`) file in this folder. It corresponds to the root route (`localhost:3000` or `localhost:3000/`). If you create a `src/route1` folder with a `page.tsx` file in it, then you can access it from the browser with `localhost:3000/route1` or `localhost:3000/route1/`. And so on. For example a `src/route1/anotherroute` with a `page.tsx` (or `.jsx`, or `.js`) in it, can be accessed from the browser with `localhost:3000/route1/anotherroute` or with an ending slash. Or `src/route2` with `localhost:3000/route2`. It doesn't matter if they are nested or not, the important thing is that in each of these folders there exists a `page.tsx` file.

You can pass params to the routes: `localhost:3000/route1?foo=bar`. Then in your `page.tsx` you do:

```typescript
// src/route1/page.tsx
"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return <div>{params.foo}</div>;
}
```

As you can see the `page.tsx` files doesn't need to be Server Components. They can be Server Components or Client Components (with `"use client"`). Server Components must be `async` functions, whether they use `await` or not inside of its body:

```typescript
// src/page.tsx
export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <>
      <h1>Hello you!</h1>
    </>
  );
}
```

This is because the implementation use the fact they are `async` functions to know they are Server Components. More on this later.

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
      <a href="/route1?foo=bar">rural</a>
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
    window.location.assign("/route2?foo=bar");
  };
  return (
    <div>
      <button onClick={handleNavigate}>Go to Route2</button>
    </div>
  );
}
```

The `setup` folder has the `server.js`, `client.jsx`, and `render-html.js` files.

The `server.js` file is the starting point of the app. It is executed by `node`. It defines an endpoint with a regex (regular expression). That is, this endpoint will capture all the `get` requests made to the app. Its purpose is to serve the `index.html` file found at the root directory of the project. Before sending this file to the Client, it does four things. For one side it gets the RSC payload of the `page.tsx` developed in the `src/someroute` folder and injects it into the html file. For the other side, it renders the page into html in a separate process and injects this html too into the html file. The reason why the server side rendering to html of the component found at `page.tsx` is done in a separate process it's because incompatibilities of use of the `renderToString` API from `react-dom/server` in a Server Components environment.

In this rendering to html of the page component in the server, Server Components must be processed first (because they are regular functions that can and should be called). So there is a utility function that does this processing and gets as a result a `JSX` that can be passed to `renderToString` method. It's because of this that the implementation needed a way to know when a component it's a Server Component or not, and that way is if they are `async` functions. So for this reason, when you define a Server Component in this implementation (without `"use client"`), use always an `async` function, no matter if you use `await` or not.

To start the app in development mode you must run `npm run dev`. This will execute Webpack in watch mode and will start the app with the `node` command. It uses the package `concurrently` to execute both in parallel. The server is faster to be ready than Webpack, so when executing the command wait for Webpack log to show and then you can navigate to the page you want (`localhost:3000` or `localhost:3000/the/page/you/want`).

There is no hot reloading, so when you do changes to the code, you have to reload yourself the page to see those changes.

The project has the package [react-enhanced-suspense](https://www.npmjs.com/package/react-enhanced-suspense) installed. It is an enhanced `Suspense` that works as React's `Suspense` if no extra props are used.

This project is inspired by [this other project](https://github.com/adamjberg/react-server-components).
