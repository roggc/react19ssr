// a server component (must be async function, even if not using await)
export default async function ServerComponent() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return (
    <div>
      <h1>Server Component</h1>
      <p>This is a server component.</p>
    </div>
  );
}
