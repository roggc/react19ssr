export default function Page({
  params: { id, name },
}: {
  params: { id: string | undefined; name: string };
}) {
  return (
    <>
      products2 page{id}
      {name}
    </>
  );
}
