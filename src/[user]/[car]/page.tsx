export default function Page({
  params: { car, name },
}: {
  params: { car: string; [key: string]: string };
}) {
  return (
    <>
      Car page{car}
      {name}
    </>
  );
}
