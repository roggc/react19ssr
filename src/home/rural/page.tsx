"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <div>
      <h1>Welcome to the Rural Page!{params.jamil}</h1>
      <p>This is a simple Next.js application.</p>
    </div>
  );
}
