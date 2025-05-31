export default function Page({
  params: { rest, name },
}: {
  params: { rest: string; [key: string]: string };
}) {
  return (
    <>
      Rest page{rest}
      {name}
    </>
  );
}
