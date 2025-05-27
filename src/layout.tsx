"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>react 19 app</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
