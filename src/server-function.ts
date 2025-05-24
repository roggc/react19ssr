"use server";

// server functions is better if they are not async functions and return a promise, instead of using await. the promise will be handled by Suspense.
export default function () {
  return new Promise<string>((res) => setTimeout(() => res("Done"), 2000));
}
