"use client";

import { useState, ComponentType, JSX, Suspense } from "react";
import AClient from "./a-client";

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
      <AClient />
      {serverComponentJSX}
    </div>
  );
}
