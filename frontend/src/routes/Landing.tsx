import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import Seo from "../components/Seo";
import { getSeoMetadata, getWebSiteJsonLd } from "../lib/seo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Landing() {
  const seo = getSeoMetadata({ pathname: "/" });
  const jsonLd = getWebSiteJsonLd();

  return (
    <>
      <Seo {...seo} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <section className="space-y-10">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Wheel Weaver
              </h1>
              <p className="text-base text-slate-600">
                Instant spoke-by-spoke lacing patterns (Schraner method) for
                common rim hole counts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/builder/32">Open Builder (32h)</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/flow/32">Open Flowchart (32h)</Link>
              </Button>
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quick Links
              </div>
              <div className="flex flex-wrap gap-2">
                {["16", "18", "20", "24", "28", "36"].map((holes) => (
                  <Button key={holes} asChild variant="outline" size="sm">
                    <Link to={`/builder/${holes}`}>Builder {holes}h</Link>
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {["16", "18", "20", "24", "28", "36"].map((holes) => (
                  <Button key={holes} asChild variant="ghost" size="sm">
                    <Link to={`/flow/${holes}`}>Flow {holes}h</Link>
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Get a printable table with odd/even steps, heads-in/heads-out
              guidance, valve reference, and DS/NDS filtering so you can stay
              focused while lacing.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Who it&apos;s for
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Wheel builders who want consistent, repeatable patterns.</li>
              <li>Mechanics who need quick reference at the stand.</li>
              <li>Home builders learning spoke order and rim indexing.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="schraner">
                <AccordionTrigger>What&apos;s Schraner?</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  It&apos;s a step-by-step lacing sequence that labels spokes
                  by order, so you always know which spoke comes next.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="front-rear">
                <AccordionTrigger>Does it work for front and rear?</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  Yes. Use the DS/NDS filter and valve reference options to
                  match your hub and wheel type.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="heads">
                <AccordionTrigger>What does heads-in mean?</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  Heads-in or heads-out describes whether the spoke head sits on
                  the inside or outside of the hub flange.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="crosses">
                <AccordionTrigger>What about 0x, 1x, 2x, 3x?</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  The builder supports common cross counts and updates the spoke
                  order and crossing notes automatically.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="data">
                <AccordionTrigger>Do you store data or cookies?</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  Wheel Weaver uses lightweight analytics; see the privacy page
                  for details and opt-out controls.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
}
