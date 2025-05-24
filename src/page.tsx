// pages can be React Server Components (async functions)
import ServerComponent from "./server-component";
import Counter from "./counter";

export default async function Page({
  params,
}: {
  params: { [key: string]: string | undefined };
}) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return (
    <>
      <h1>Hello you!</h1>
      <Counter serverComponentJSX={<ServerComponent />} />
    </>
  );
}
