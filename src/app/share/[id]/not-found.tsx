import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,_theme(colors.rose.200/0.8)_30%,_theme(colors.pink.100/0.6)_50%,_theme(colors.red.50/0.3)_70%,_transparent)] p-4">
      <div className="w-full max-w-md">
        <div className="space-y-4 text-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Link Not Found</h1>
          </div>
          <div className="space-y-3">
            <p className="leading-relaxed text-neutral-600">
              This shared schedule link has expired or been removed.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex items-start space-x-2">
                <div className="text-sm text-amber-800">
                  <p className="mb-1 font-medium">Possible reasons:</p>
                  <ul className="space-y-1 text-amber-700">
                    <li>• The link has expired</li>
                    <li>• The schedule was deleted</li>
                    <li>• The URL was typed incorrectly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <Button
              asChild
              className="group relative w-full overflow-hidden rounded-lg bg-indigo-600 font-medium text-white transition-all duration-300 hover:bg-indigo-700"
            >
              <Link href="/" className="flex items-center justify-center px-4 py-6">
                <ArrowLeft className="absolute left-4 h-4 w-4 -translate-x-8 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                <span className="transform transition-transform duration-300 ease-out group-hover:translate-x-2">
                  Go Back
                </span>
              </Link>
            </Button>
          </div>
          <div className="mt-8 border-t border-neutral-200 pt-4">
            <p className="text-sm text-neutral-500">
              Need a new link? Ask the person who shared this schedule to send you a fresh one.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
