import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Privacy & cookies</h1>
        <p className="mt-1 text-sm text-slate-600">
          We only use analytics cookies to understand usage and improve Wheel
          Weaver.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">
          Analytics cookies
        </h2>
        <p className="mt-2">
          We use Google Analytics 4 to measure page views and feature usage
          (such as pattern generation and exports). This helps us prioritize
          improvements and spot performance issues.
        </p>
        <p className="mt-2">
          Analytics data is only collected if you grant consent. You can change
          your preference at any time in Settings.
        </p>
        <div className="mt-3">
          <Link
            to="/settings#analytics"
            className="underline underline-offset-4"
          >
            Manage analytics preferences
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">
          Internal traffic
        </h2>
        <p className="mt-2">
          If you are testing the app, you can mark your device as internal
          traffic in Settings. This sets a user property so you can exclude your
          own activity in GA4 reports.
        </p>
      </div>
    </section>
  );
}
