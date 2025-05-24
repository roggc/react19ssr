"use client";

import Suspense from "react-enhanced-suspense";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <div>
      <h1>Welcome {params.name}!</h1>
      <Suspense fallback={<div>Loading...</div>}></Suspense>
    </div>
  );
}
