"use client";

import Suspense from "react-enhanced-suspense";
import { Suspense as ReactSuspense } from "react";
import Counter from "./counter";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <div>
      <h1>Welcome {params.name}!</h1>
      <Suspense fallback={<div>Loading...</div>} resourceId="my-resourcex">
        {
          new Promise((resolve) =>
            setTimeout(() => resolve("Hello from Suspense!"), 2000)
          )
        }
      </Suspense>
      <Counter />
    </div>
  );
}
