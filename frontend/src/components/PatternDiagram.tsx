import type { PatternRow } from "../lib/types";

export type PatternDiagramProps = {
  holes: number;
  rows: PatternRow[];
  visibleRows: PatternRow[];
  startRimHole: number;
  valveReference: "right_of_valve" | "left_of_valve";
  hoveredSpoke?: string | null;
};

const RIM_RADIUS = 160;
const DS_FLANGE_RADIUS = 105;
const NDS_FLANGE_RADIUS = 85;
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
  hoveredSpoke,
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
  const rimLabelSet = new Set<number>([1, valveLeft]);
  const rimStep = 360 / holes;

  // midpoint between valveLeft (valveRight-1) and valveRight
  const valveAngle = rimAngle(holes, valveRight) - rimStep / 2;

  // point ON the rim for the arrow
  const valveRimPoint = pointOnCircle(RIM_RADIUS, valveAngle);

  // point OUTSIDE the rim for the text (prevents it “hugging” one side visually)
  const valveTextPoint = pointOnCircle(RIM_RADIUS + 26, valveAngle);

  return (
    <svg viewBox="-220 -220 440 440" className="w-full h-[360px]">
      {rows.map((row) => {
        const rim = pointOnCircle(RIM_RADIUS, rimAngle(holes, row.rimHole));
        const hubAngleOffset = row.side === "DS" ? baseAngleDS : baseAngleNDS;
        const sideOffset = row.side === "DS" ? HUB_OFFSET : -HUB_OFFSET;
        const hubRadius = row.side === "DS" ? DS_FLANGE_RADIUS : NDS_FLANGE_RADIUS;
        const hub = pointOnCircle(
          hubRadius,
          row.side === "DS"
            ? hubRawDegDS(row.hubHole, hubStep) + hubAngleOffset
            : hubRawDegNDS(row.hubHole, hubStep) + hubAngleOffset
        );
        const hubX = hub.x + sideOffset;
        const isHovered = hoveredSpoke === row.spoke;
        const isVisible = visibleSet.has(row.order);
        const strokeOpacity = isHovered ? 1 : isVisible ? 0.85 : 0.12;
        const strokeWidth = isHovered ? 3.5 : isVisible ? 2.4 : 1;
        return (
          <line
            key={`${row.order}-${row.side}`}
            x1={hubX}
            y1={hub.y}
            x2={rim.x}
            y2={rim.y}
            stroke="#334155"
            strokeOpacity={strokeOpacity}
            strokeWidth={strokeWidth}
          />
        );
      })}

      <circle
        cx={0}
        cy={0}
        r={RIM_RADIUS}
        fill="none"
        stroke="#475569"
        strokeWidth={2.2}
      />
      <circle
        cx={HUB_OFFSET}
        cy={0}
        r={DS_FLANGE_RADIUS}
        fill="none"
        stroke="#64748b"
        strokeWidth={1.6}
      />
      <circle
        cx={-HUB_OFFSET}
        cy={0}
        r={NDS_FLANGE_RADIUS}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.3}
      />
      <circle cx={0} cy={0} r={6} fill="#0f172a" />

      <text x={HUB_OFFSET + DS_FLANGE_RADIUS + 10} y={-8} fontSize={10} fill="#334155">
        DS
      </text>
      <text x={-HUB_OFFSET - NDS_FLANGE_RADIUS - 18} y={-8} fontSize={10} fill="#334155">
        NDS
      </text>

      {Array.from({ length: holes }, (_, idx) => {
        const hole = idx + 1;
        const point = pointOnCircle(RIM_RADIUS, rimAngle(holes, hole));
        const hovered = hoveredSpoke
          ? rows.some(
              (row) =>
                row.spoke === hoveredSpoke && row.rimHole === hole
            )
          : false;
        return (
          <circle
            key={`rim-${hole}`}
            cx={point.x}
            cy={point.y}
            r={hovered ? 5 : 3.2}
            fill={hovered ? "#0f172a" : "#94a3b8"}
          >
            <title>Rim hole {hole}</title>
          </circle>
        );
      })}

      {Array.from({ length: h }, (_, idx) => {
        const hole = idx + 1;
        const dsPoint = pointOnCircle(
          DS_FLANGE_RADIUS,
          hubRawDegDS(hole, hubStep) + baseAngleDS
        );
        const ndsPoint = pointOnCircle(
          NDS_FLANGE_RADIUS,
          hubRawDegNDS(hole, hubStep) + baseAngleNDS
        );
        const hoveredDS = hoveredSpoke
          ? rows.some(
              (row) =>
                row.spoke === hoveredSpoke &&
                row.side === "DS" &&
                row.hubHole === hole
            )
          : false;
        const hoveredNDS = hoveredSpoke
          ? rows.some(
              (row) =>
                row.spoke === hoveredSpoke &&
                row.side === "NDS" &&
                row.hubHole === hole
            )
          : false;
        return (
          <g key={`hub-${hole}`}>
            <circle
              cx={dsPoint.x + HUB_OFFSET}
              cy={dsPoint.y}
              r={hoveredDS ? 4.4 : 3.4}
              fill={hoveredDS ? "#0f172a" : "#475569"}
            >
              <title>DS hub hole {hole}</title>
            </circle>
            <circle
              cx={ndsPoint.x - HUB_OFFSET}
              cy={ndsPoint.y}
              r={hoveredNDS ? 4.2 : 3.2}
              fill={hoveredNDS ? "#0f172a" : "#64748b"}
            >
              <title>NDS hub hole {hole}</title>
            </circle>
          </g>
        );
      })}

      {Array.from({ length: holes }, (_, idx) => idx + 1)
        .filter((hole) => hole % 4 === 0)
        .map((hole) => {
          const point = pointOnCircle(RIM_RADIUS + 14, rimAngle(holes, hole));
          return (
            <text
              key={`rim-tick-${hole}`}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              fontSize={8}
              fill="#94a3b8"
            >
              {hole}
            </text>
          );
        })}

      {Array.from({ length: h }, (_, idx) => idx + 1)
        .filter((hole) => hole % 2 === 0)
        .map((hole) => {
          const point = pointOnCircle(
            DS_FLANGE_RADIUS + 10,
            hubRawDegDS(hole, hubStep) + baseAngleDS
          );
          return (
            <text
              key={`hub-tick-${hole}`}
              x={point.x + HUB_OFFSET}
              y={point.y}
              textAnchor="middle"
              fontSize={7}
              fill="#94a3b8"
            >
              {hole}
            </text>
          );
        })}

      {Array.from(rimLabelSet).map((hole) => {
        const point = pointOnCircle(RIM_RADIUS + 14, rimAngle(holes, hole));
        return (
          <text
            key={`label-${hole}`}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            fontSize={8}
            fill="#94a3b8"
          >
            {hole}
          </text>
        );
      })}

      <line
        x1={valveRimPoint.x}
        y1={valveRimPoint.y - 10}
        x2={valveRimPoint.x}
        y2={valveRimPoint.y - 2}
        stroke="#0f172a"
        strokeWidth={1.6}
      />
      <polygon
        points={`${valveRimPoint.x},${valveRimPoint.y + 2} ${valveRimPoint.x - 6},${
          valveRimPoint.y - 2
        } ${valveRimPoint.x + 6},${valveRimPoint.y - 2}`}
        fill="#0f172a"
      />
      <text
        x={valveTextPoint.x}
        y={valveTextPoint.y}
        textAnchor="middle"
        dominantBaseline="alphabetic"
        fontSize={10}
        fill="#0f172a"
      >
        Valve
      </text>
    </svg>
  );
}
