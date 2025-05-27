"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2>Hello from React 2</h2>
      {children}
    </>
  );
}
