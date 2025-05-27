"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>fun!</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
