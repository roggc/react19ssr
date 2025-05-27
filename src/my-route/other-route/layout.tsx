"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h3>React Enhanced Suspense3</h3>
      {children}
    </>
  );
}
