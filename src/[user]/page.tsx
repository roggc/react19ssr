export default function Page({
  params: { user },
}: {
  params: { user: string };
}) {
  return <>Users page{user}</>;
}
