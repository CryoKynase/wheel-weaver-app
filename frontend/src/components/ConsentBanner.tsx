import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { grantAnalyticsConsent, hasAnalyticsConsent } from "../lib/analytics";

const DISMISS_KEY = "wheelweaver.analytics.dismissed";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "true";
    setVisible(!dismissed && !hasAnalyticsConsent());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <div className="max-w-xl">
          We use analytics cookies to understand feature usage and improve the
          Wheel Weaver experience.
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
