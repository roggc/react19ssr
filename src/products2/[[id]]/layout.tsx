import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <h2>products2</h2>
      {children}
    </>
  );
}
