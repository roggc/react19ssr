"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h3>Layout user</h3>
      {children}
    </>
  );
}
