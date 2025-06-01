// "use client";
export default function Page({
  params: { name },
}: {
  params: { name: string };
}) {
  return (
    <>
      some page!
      {name}
    </>
  );
}
