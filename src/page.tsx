import Counter from "./counter";

const AnotherServerComponent = async function () {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return (
    <div>
      <h1>Another Server Component</h1>
      <p>This is a server component.</p>
    </div>
  );
};

export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return (
    <>
      <h1>Hello you!{params.jamil}</h1>
      <p>Welcome to your new Vite + React + TypeScript + Tailwind CSS app!</p>
      <Counter serverComponentJSX={<AnotherServerComponent />} />
      <a href="/?jamil=baz">Change Jamil</a>
      <a href="/home/rural?jamil=from rural">rural</a>
    </>
  );
}
