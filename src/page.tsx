// "use client";
// pages can be React Server Components (async functions)
import ServerComponent from "./server-component";
import Counter from "./counter";
import { Fragment, Suspense as ReactSuspense } from "react";
import Suspense from "react-enhanced-suspense";

export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  // await new Promise((resolve) => setTimeout(resolve, 4000));
  return (
    <>
      <Suspense fallback={<div>Loading...</div>} resourceId="my-resource">
        {new Promise((resolve) => setTimeout(() => resolve("Loaded"), 3000))}
      </Suspense>
      <h1>Hello you!</h1>
      <Counter serverComponentJSX={<ServerComponent />} />
    </>
  );
}
