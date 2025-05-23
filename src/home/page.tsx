"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  return (
    <div>
      <h1>Welcome to Next.js!{params.jamil}</h1>
      <p>This is a simple Next.js application.</p>
      <a href="/?jamil=foo">root</a>
      <a href="/home/rural?jamil=bar">rural</a>
    </div>
  );
}
