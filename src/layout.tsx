"use client";
import type { ReactNode } from "react";

export default function Layout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>react 19 app</title>
      </head>
      <body>
        {sidebar}
        {children}
      </body>
    </html>
  );
}
