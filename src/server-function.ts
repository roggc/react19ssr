"use server";

export default async function () {
  return await new Promise<string>((res) =>
    setTimeout(() => res("Done"), 4000)
  );
}
