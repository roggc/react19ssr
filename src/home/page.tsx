"use client";

export default function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  const handleNavigate = () => {
    // Navegar programáticamente a /home/rural?jamil=from rural con recarga
    window.location.assign("/home/rural?jamil=from rural 2");
  };
  return (
    <div>
      <h1>Welcome to Next.js!{params.jamil}</h1>
      <p>This is a simple Next.js application.</p>
      <a href="/?jamil=foo">root</a>
      <a href="/home/rural?jamil=bar">rural</a>
      <button onClick={handleNavigate}>Go to Rural</button>
    </div>
  );
}
