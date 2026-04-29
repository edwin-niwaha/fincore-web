'use client';

import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function GoogleLoginButton({
  onToken,
  disabled,
}: {
  onToken: (accessToken: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(
    null,
  );

  useEffect(() => {
    if (!env.googleClientId) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity]',
    );

    const script = existing ?? document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';

    script.onload = () => {
      tokenClientRef.current =
        window.google?.accounts?.oauth2?.initTokenClient({
          client_id: env.googleClientId,
          scope: 'openid email profile',
          callback: async (response) => {
            if (response.error || !response.access_token) {
              toast.error('Gmail sign-in was cancelled or failed.');
              setIsSubmitting(false);
              return;
            }

            try {
              await onToken(response.access_token);
            } finally {
              setIsSubmitting(false);
            }
          },
        }) ?? null;

      setIsReady(Boolean(tokenClientRef.current));
    };

    if (!existing) {
      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      script.onload?.(new Event('load'));
    }
  }, [onToken]);

  if (!env.googleClientId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-semibold leading-5 text-amber-800">
        Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Gmail login.
      </div>
    );
  }

  return (
    <Button
      type="button"
      disabled={disabled || !isReady || isSubmitting}
      onClick={() => {
        setIsSubmitting(true);
        tokenClientRef.current?.requestAccessToken();
      }}
      className="
        flex h-12 w-full items-center justify-center gap-3
        rounded-xl border border-slate-300 bg-white
        px-4 py-3 font-bold !text-slate-800
        shadow-sm hover:bg-slate-50 hover:!text-slate-950
        disabled:cursor-not-allowed disabled:opacity-60
      "
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[#EA4335]">
        <Mail className="h-4 w-4" />
      </span>

      <span className="block text-sm font-bold text-slate-800">
        {isSubmitting
          ? 'Connecting to Gmail...'
          : !isReady
            ? 'Loading Gmail...'
            : 'Continue with Gmail'}
      </span>
    </Button>
  );
}
