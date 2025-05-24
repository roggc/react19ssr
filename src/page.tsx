// "use client";
// pages can be React Server Components (async functions)
import ServerComponent from "./server-component";
import Counter from "./counter";
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  //
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        {new Promise((resolve) => setTimeout(() => resolve("Loaded"), 3000))}
      </Suspense>
      <h1>Hello you!</h1>
      <Counter serverComponentJSX={<ServerComponent />} />
    </>
  );
}
