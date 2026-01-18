import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  getAnalyticsConsentStatus,
  grantAnalyticsConsent,
  revokeAnalyticsConsent,
} from "../lib/analytics";

const DISMISS_KEY = "wheelweaver.analytics.dismissed";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "true";
    const consentStatus = getAnalyticsConsentStatus();
    setVisible(!dismissed && consentStatus === "unset");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <div className="max-w-xl space-y-1">
          <div>
            We use analytics cookies to understand feature usage and improve the
            Wheel Weaver experience.
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy & cookies
            </Link>
            <Link to="/settings#analytics" className="underline underline-offset-4">
              Manage cookies
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              grantAnalyticsConsent();
              setVisible(false);
            }}
          >
            Accept analytics
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              revokeAnalyticsConsent();
              window.sessionStorage.setItem(DISMISS_KEY, "true");
              setVisible(false);
            }}
          >
            Reject analytics
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              window.sessionStorage.setItem(DISMISS_KEY, "true");
              setVisible(false);
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
