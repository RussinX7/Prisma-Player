import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthProvider } from "@/features/auth/model/types";

function GoogleMark() {
  return (
    <svg aria-hidden width="17" height="17" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.03.96-3.39.96-2.6 0-4.8-1.75-5.59-4.11H3.07v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.92A6.02 6.02 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.5H3.07A10 10 0 0 0 2 12c0 1.61.38 3.13 1.07 4.5l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.5l3.34 2.58A5.97 5.97 0 0 1 12 5.97Z" />
    </svg>
  );
}

export function SocialAuthButtons({
  disabled,
  onSelect,
}: {
  disabled: Partial<Record<AuthProvider, boolean>>;
  onSelect: (provider: AuthProvider) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button type="button" variant="outline" size="lg" disabled={disabled.google} onClick={() => onSelect("google")} className="h-11 rounded-xl">
        <GoogleMark /> Google
      </Button>
      <Button type="button" variant="outline" size="lg" disabled={disabled.apple} onClick={() => onSelect("apple")} className="h-11 rounded-xl">
        <Apple size={17} fill="currentColor" /> Apple
      </Button>
    </div>
  );
}
