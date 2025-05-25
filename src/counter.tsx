"use client";

import { useState } from "react";
import Suspense from "react-enhanced-suspense";
import serverFunction from "./server-function";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <Suspense fallback={<div>Loading....</div>} resourceId="server-function">
        {serverFunction()}
      </Suspense>
    </div>
  );
}
