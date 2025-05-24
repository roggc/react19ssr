"use client";

import Suspense from "react-enhanced-suspense";
import { Suspense as ReactSuspense } from "react";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <div>
      <h1>Welcome {params.name}!</h1>
      <ReactSuspense fallback={<div>Loading...</div>}>
        {
          new Promise((resolve) =>
            setTimeout(() => resolve("Hello from Suspense!"), 2000)
          )
        }
      </ReactSuspense>
    </div>
  );
}
