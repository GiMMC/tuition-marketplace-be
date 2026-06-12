import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center text-center max-w-2xl px-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-blue-600">
          Tuition Marketplace API
        </h1>

        <p className="text-lg text-gray-600">
          Welcome to the Tuition Marketplace Backend. This is a RESTful API built with Next.js, PostgreSQL, Redis, and Supabase.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/api-docs"
            className="rounded-full bg-blue-600 text-white px-8 py-3 font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            View Swagger Documentation
          </Link>
          <a
            href="https://github.com/tuition-marketplace-be"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gray-300 bg-white px-8 py-3 font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            View Source Code
          </a>
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-gray-500">
        © {new Date().getFullYear()} Tuition Marketplace
      </footer>
    </div>
  );
}
