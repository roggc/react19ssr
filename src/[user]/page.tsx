export default function Page({
  params: { user, name },
}: {
  params: { user: string; [key: string]: string };
}) {
  return (
    <>
      Users page{user}
      {name}
    </>
  );
}
