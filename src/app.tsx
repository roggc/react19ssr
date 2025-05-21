"use client";

import { useState } from "react";
import Suspense from "react-enhanced-suspense";
import serverFunction from "./server-function";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Hello you!</h1>
      <button onClick={() => setCount(count + 1)}>{count}</button>
      <Suspense fallback="Loading..." resourceId="my-resource">
        {serverFunction()}
      </Suspense>
    </>
  );
}
