import Link from "next/link";
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold mb-3">Page not found</h1>
      <Link href="/posts" className="btn-primary">Go to Posts</Link>
    </main>
  );
}
