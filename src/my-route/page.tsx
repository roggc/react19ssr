// pages can be React Client Components (not async functions)
"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const handleNavigate = () => {
    // Navigate programmatically to a different route
    window.location.assign("/");
  };
  return (
    <div>
      <a href="/my-route/other-route?name=Roger">/my-route/other-route page</a>
      <button onClick={handleNavigate}>Go to /</button>
    </div>
  );
}
