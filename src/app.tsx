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

export default async function App() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return (
    <>
      <h1>Hello you!</h1>
      <p>Welcome to your new Vite + React + TypeScript + Tailwind CSS app!</p>
      <Counter serverComponentJSX={<AnotherServerComponent />} />
    </>
  );
}
