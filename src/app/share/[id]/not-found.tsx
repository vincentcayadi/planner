import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_theme(colors.rose.200/0.8)_30%,_theme(colors.pink.100/0.6)_50%,_theme(colors.red.50/0.3)_70%,_transparent)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">
              Link Not Found
            </h1>
          </div>
          <div className="space-y-3">
            <p className="text-neutral-600 leading-relaxed">
              This shared schedule link has expired or been removed.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <div className="flex items-start space-x-2">
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Possible reasons:</p>
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
              className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-300 overflow-hidden relative"
            >
              <Link
                href="/"
                className="py-6 px-4 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 absolute left-4 transform -translate-x-8 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out" />
                <span className="transform group-hover:translate-x-2 transition-transform duration-300 ease-out">
                  Go Back
                </span>
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-neutral-200 mt-8">
            <p className="text-sm text-neutral-500">
              Need a new link? Ask the person who shared this schedule to send
              you a fresh one.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
