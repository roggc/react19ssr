"use client";

import { useState, JSX, Suspense as ReactSuspense } from "react";
import Suspense from "react-enhanced-suspense";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      {/* {serverComponentJSX}
      <Suspense fallback={<div>Loading....</div>} resourceId="server-component">
        {serverFunction()}
      </Suspense> */}
    </div>
  );
}
