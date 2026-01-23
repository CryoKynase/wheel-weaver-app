import type { StepId } from "../methods/types";
import { Button } from "@/components/ui/Button";

type StepToggleProps = {
  steps: { id: StepId; label: string }[];
  activeStep: StepId;
  onChange: (step: StepId) => void;
  compact?: boolean;
};

export default function StepToggle({
  steps,
  activeStep,
  onChange,
  compact = false,
}: StepToggleProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background/60 p-1 ${
        compact ? "max-w-full" : ""
      }`}
      role="group"
      aria-label="Show lacing step"
    >
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex min-w-max gap-1">
          {steps.map((step) => {
            const active = step.id === activeStep;
            return (
              <Button
                key={step.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(step.id)}
                aria-pressed={active}
                className={`h-9 rounded-xl px-3 text-sm font-medium transition ${
                  active
                    ? "border border-primary/30 bg-primary/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                } focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2`}
              >
                {step.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
