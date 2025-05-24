"use client";

import { useState, JSX, Suspense } from "react";
// import Suspense from "react-enhanced-suspense";
import serverFunction from "./server-function";

export default function Counter({
  serverComponentJSX,
}: {
  serverComponentJSX: JSX.Element;
}) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      {serverComponentJSX}
      <Suspense fallback={<div>Loading...</div>}>{serverFunction()}</Suspense>
    </div>
  );
}
