// export default function Layout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <head>
//         <title>React Enhanced Suspense</title>
//       </head>
//       <body>
//         <main>{children}</main>
//       </body>
//     </html>
//   );
// }
"use client";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2>React Enhanced Suspense2</h2>
      {children}
    </>
  );
}
