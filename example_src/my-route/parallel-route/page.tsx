"use client";

import Suspense from "react-enhanced-suspense";
import Counter from "./counter";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <>
      <h1>Welcome {params.name}!</h1>
      <Suspense fallback={<div>Loading...</div>}>
        {
          new Promise((resolve) =>
            setTimeout(() => resolve("Hello from Suspense!"), 2000)
          )
        }
      </Suspense>
      <Counter />
    </>
  );
}
