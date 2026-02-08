import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AM</span>
            </div>
            <span className="font-semibold text-slate-900">AdMirror</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Log In
            </Link>
            <Link href="/login?signup=true" className="hover:text-slate-900 transition-colors">
              Sign Up
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} AdMirror. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
