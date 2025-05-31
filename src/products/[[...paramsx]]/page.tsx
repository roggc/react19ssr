// "use client";
export default function Page({
  params: { paramsx, name },
}: {
  params: { paramsx: string[]; name: string };
}) {
  return (
    <>
      products page!{paramsx}
      {name}
    </>
  );
}
