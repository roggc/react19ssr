"use server";

export default function () {
  return new Promise<string>((res) => setTimeout(() => res("Done"), 2000));
}
