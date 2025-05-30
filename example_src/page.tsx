"use client";

import Counter from "./counter";
import Suspense from "react-enhanced-suspense";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <>
      <h1>Hello you!</h1>
      <Suspense fallback={<div>Loading...</div>}>
        {new Promise((resolve) => setTimeout(() => resolve("Loaded"), 3000))}
      </Suspense>
      <Counter />
    </>
  );
}
