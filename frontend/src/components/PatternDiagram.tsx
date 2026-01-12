import type { PatternRow } from "../lib/types";

export type PatternDiagramProps = {
  holes: number;
  rows: PatternRow[];
  visibleRows: PatternRow[];
  startRimHole: number;
  valveReference: "right_of_valve" | "left_of_valve";
};

const RIM_RADIUS = 160;
const HUB_RADIUS = 95;
const HUB_OFFSET = 18;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function rimAngle(holes: number, index: number) {
  return -90 + (index - 1) * (360 / holes);
}

function hubRawDegDS(index: number, step: number) {
  return (index - 1) * step;
}

function hubRawDegNDS(index: number, step: number) {
  return (index - 1) * step + step / 2;
}

function pointOnCircle(radius: number, angleDeg: number) {
  const angle = degToRad(angleDeg);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function effectiveStartRimHole(
  holes: number,
  startRimHole: number,
  valveReference: "right_of_valve" | "left_of_valve"
) {
  if (valveReference === "right_of_valve") {
    return startRimHole;
  }
  return ((startRimHole - 2 + holes) % holes) + 1;
}

function wrapHole(holes: number, hole: number) {
  return ((hole - 1 + holes) % holes) + 1;
}

function findReference(rows: PatternRow[], side: "DS" | "NDS", needle: string) {
  return rows.find((row) => row.side === side && row.notes.includes(needle));
}

export default function PatternDiagram({
  holes,
  rows,
  visibleRows,
  startRimHole,
  valveReference,
}: PatternDiagramProps) {
  const h = holes / 2;
  const hubStep = 360 / h;

  const dsRef = findReference(rows, "DS", "Reference at valve");
  const ndsRef = findReference(rows, "NDS", "NDS start reference");

  const baseAngleDS = dsRef
    ? rimAngle(holes, dsRef.rimHole) - hubRawDegDS(dsRef.hubHole, hubStep)
    : -90;
  const baseAngleNDS = ndsRef
    ? rimAngle(holes, ndsRef.rimHole) - hubRawDegNDS(ndsRef.hubHole, hubStep)
    : baseAngleDS;

  const valveRight = effectiveStartRimHole(
    holes,
    startRimHole,
    valveReference
  );
  const valveLeft = wrapHole(holes, valveRight - 1);
  const visibleSet = new Set(visibleRows.map((row) => row.order));

  return (
    <svg viewBox="-220 -220 440 440" className="w-full h-[360px]">
      <circle
        cx={0}
        cy={0}
        r={RIM_RADIUS}
        fill="none"
        stroke="#e2e8f0"
      />
      <circle
        cx={0}
        cy={0}
        r={HUB_RADIUS}
        fill="none"
        stroke="#e2e8f0"
      />

      {rows.map((row) => {
        const rim = pointOnCircle(RIM_RADIUS, rimAngle(holes, row.rimHole));
        const hubAngleOffset = row.side === "DS" ? baseAngleDS : baseAngleNDS;
        const sideOffset = row.side === "DS" ? HUB_OFFSET : -HUB_OFFSET;
        const hub = pointOnCircle(
          HUB_RADIUS,
          row.side === "DS"
            ? hubRawDegDS(row.hubHole, hubStep) + hubAngleOffset
            : hubRawDegNDS(row.hubHole, hubStep) + hubAngleOffset
        );
        const hubX = hub.x + sideOffset;
        const isVisible = visibleSet.has(row.order);
        return (
          <line
            key={`${row.order}-${row.side}`}
            x1={hubX}
            y1={hub.y}
            x2={rim.x}
            y2={rim.y}
            stroke="#334155"
            strokeOpacity={isVisible ? 0.9 : 0.15}
            strokeWidth={isVisible ? 2.5 : 1}
          />
        );
      })}

      {Array.from({ length: holes }, (_, idx) => {
        const hole = idx + 1;
        const point = pointOnCircle(RIM_RADIUS, rimAngle(holes, hole));
        const isValve = hole === valveLeft || hole === valveRight;
        return (
          <circle
            key={`rim-${hole}`}
            cx={point.x}
            cy={point.y}
            r={isValve ? 4 : 3}
            fill={isValve ? "#0f172a" : "#94a3b8"}
          />
        );
      })}

      {Array.from({ length: h }, (_, idx) => {
        const hole = idx + 1;
        const dsPoint = pointOnCircle(
          HUB_RADIUS,
          hubRawDegDS(hole, hubStep) + baseAngleDS
        );
        const ndsPoint = pointOnCircle(
          HUB_RADIUS,
          hubRawDegNDS(hole, hubStep) + baseAngleNDS
        );
        return (
          <g key={`hub-${hole}`}>
            <circle
              cx={dsPoint.x + HUB_OFFSET}
              cy={dsPoint.y}
              r={2.5}
              fill="#64748b"
            />
            <circle
              cx={ndsPoint.x - HUB_OFFSET}
              cy={ndsPoint.y}
              r={2.5}
              fill="#64748b"
            />
          </g>
        );
      })}

      <circle cx={0} cy={-RIM_RADIUS} r={5} fill="#0f172a" />
      <text
        x={0}
        y={-RIM_RADIUS - 12}
        textAnchor="middle"
        fontSize={10}
        fill="#0f172a"
      >
        Valve
      </text>

      {[valveLeft, valveRight].map((hole) => {
        const point = pointOnCircle(RIM_RADIUS, rimAngle(holes, hole));
        return (
          <text
            key={`label-${hole}`}
            x={point.x}
            y={point.y - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#0f172a"
          >
            {hole}
          </text>
        );
      })}
    </svg>
  );
}
