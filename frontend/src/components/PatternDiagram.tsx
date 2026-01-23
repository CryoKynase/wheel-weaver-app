import { useId } from "react";
import type { PatternRow } from "../lib/types";

export type PatternDiagramProps = {
  holes: number;
  rows: PatternRow[];
  visibleRows: PatternRow[];
  startRimHole: number;
  valveReference: "right_of_valve" | "left_of_valve";
  hoveredSpoke?: string | null;
  showLabels?: boolean;
  showFaintSpokes?: boolean;
  view?: "classic" | "realistic" | "engineer";
  curved?: boolean;
  occlusion?: boolean;
  shortArc?: boolean;
  lookFrom?: "DS" | "NDS";
  showRearFlange?: boolean;
  showRearSpokes?: boolean;
};

const RIM_RADIUS = 160;
const DS_FLANGE_RADIUS = 105;
const NDS_FLANGE_RADIUS = 85;
const HUB_OFFSET = 18;
const ENGINEER_FLANGE_SCALE = 0.55;
const ENGINEER_HUB_HOLE_SCALE = 0.7;
const CURVE_CONTROL_RATIO = 0.8;
const CURVE_RADIAL_RATIO = 0.12;
const HUB_BODY_RATIO = 0.65;

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

function wrapToPi(angleRad: number) {
  const twoPi = Math.PI * 2;
  let wrapped = angleRad % twoPi;
  if (wrapped <= -Math.PI) {
    wrapped += twoPi;
  } else if (wrapped > Math.PI) {
    wrapped -= twoPi;
  }
  return wrapped;
}

function valveRightHole(
  holes: number,
  startRimHole: number,
  valveReference: "right_of_valve" | "left_of_valve"
) {
  if (valveReference === "right_of_valve") {
    return startRimHole;
  }
  return wrapHole(holes, startRimHole + 1);
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
  showLabels = false,
  showFaintSpokes = true,
  view = "classic",
  curved = true,
  occlusion = true,
  shortArc = true,
  lookFrom = "DS",
  showRearFlange = true,
  showRearSpokes = true,
}: PatternDiagramProps) {
  const occlusionId = useId();
  const h = holes / 2;
  const hubStep = 360 / h;
  const dsFlangeRadius =
    view === "engineer"
      ? DS_FLANGE_RADIUS * ENGINEER_FLANGE_SCALE
      : DS_FLANGE_RADIUS;
  const ndsFlangeRadius =
    view === "engineer"
      ? NDS_FLANGE_RADIUS * ENGINEER_FLANGE_SCALE
      : NDS_FLANGE_RADIUS;
  const hubBodyRadius =
    Math.min(dsFlangeRadius, ndsFlangeRadius) * HUB_BODY_RATIO;

  const dsRef = findReference(rows, "DS", "Reference at valve");
  const ndsRef = findReference(rows, "NDS", "NDS start reference");

  const baseAngleDS = dsRef
    ? rimAngle(holes, dsRef.rimHole) - hubRawDegDS(dsRef.hubHole, hubStep)
    : -90;
  const baseAngleNDS = ndsRef
    ? rimAngle(holes, ndsRef.rimHole) - hubRawDegNDS(ndsRef.hubHole, hubStep)
    : baseAngleDS;

  const valveRight = valveRightHole(holes, startRimHole, valveReference);
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

  const buildSpoke = (row: PatternRow, useOffset: boolean) => {
    const rimAngleDeg = rimAngle(holes, row.rimHole);
    const rim = pointOnCircle(RIM_RADIUS, rimAngleDeg);
    const hubAngleOffset = row.side === "DS" ? baseAngleDS : baseAngleNDS;
    const sideOffset = row.side === "DS" ? HUB_OFFSET : -HUB_OFFSET;
    const hubRadius = row.side === "DS" ? dsFlangeRadius : ndsFlangeRadius;
    const hubAngleDeg =
      row.side === "DS"
        ? hubRawDegDS(row.hubHole, hubStep) + hubAngleOffset
        : hubRawDegNDS(row.hubHole, hubStep) + hubAngleOffset;
    const hub = pointOnCircle(hubRadius, hubAngleDeg);
    const hubX = hub.x + (useOffset ? sideOffset : 0);
    const isHovered = hoveredSpoke === row.spoke;
    const isVisible = visibleSet.has(row.order);
    const strokeOpacity = isHovered
      ? 1
      : isVisible
        ? 0.85
        : showFaintSpokes
          ? 0.12
          : 0;
    const strokeWidth = isHovered ? 3.5 : isVisible ? 2.4 : 1;

    if (view === "classic" || view === "engineer" || !curved) {
      return {
        element: (
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
        ),
        strokeOpacity,
        strokeWidth,
        isHovered,
      };
    }

    const hubAngleRad = degToRad(hubAngleDeg);
    const rimAngleRad = degToRad(rimAngleDeg);
    const delta = shortArc
      ? wrapToPi(rimAngleRad - hubAngleRad)
      : rimAngleRad - hubAngleRad;
    const tangentSign = (delta >= 0 ? 1 : -1) * (row.side === "DS" ? 1 : -1);
    const tangentUnit = {
      x: -Math.sin(hubAngleRad) * tangentSign,
      y: Math.cos(hubAngleRad) * tangentSign,
    };
    const radialUnit = {
      x: hub.x / hubRadius,
      y: hub.y / hubRadius,
    };
    const controlLen = hubRadius * CURVE_CONTROL_RATIO;
    const radialLen = hubRadius * CURVE_RADIAL_RATIO;
    const control = {
      x: hubX + tangentUnit.x * controlLen + radialUnit.x * radialLen,
      y: hub.y + tangentUnit.y * controlLen + radialUnit.y * radialLen,
    };

    return {
      element: (
        <path
          key={`${row.order}-${row.side}`}
          d={`M ${hubX} ${hub.y} Q ${control.x} ${control.y} ${rim.x} ${rim.y}`}
          fill="none"
          stroke="#334155"
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      ),
      strokeOpacity,
      strokeWidth,
      isHovered,
    };
  };

  const spokeElements = rows.map((row) => buildSpoke(row, true).element);
  const engineerSpokes = rows.map((row) => {
    const { element, strokeOpacity, isHovered } = buildSpoke(row, false);
    return { row, element, strokeOpacity, isHovered };
  });

  return (
    <svg viewBox="-220 -220 440 440" className="w-full h-[360px]">
      <defs>
        <marker
          id="diagram-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
        {view === "realistic" && occlusion && (
          <mask id={occlusionId}>
            <rect x="-220" y="-220" width="440" height="440" fill="#fff" />
            <circle cx={0} cy={0} r={hubBodyRadius} fill="#000" />
          </mask>
        )}
      </defs>
      {view === "engineer" ? (
        (() => {
          const frontSide = lookFrom;
          const rearSide = lookFrom === "DS" ? "NDS" : "DS";
          const rearFlangeRadius =
            rearSide === "DS" ? dsFlangeRadius : ndsFlangeRadius;
          const frontFlangeRadius =
            frontSide === "DS" ? dsFlangeRadius : ndsFlangeRadius;
          const rearMaskId = `${occlusionId}-rear`;
          const rearSpokes = engineerSpokes.filter(
            ({ row }) => row.side === rearSide
          );
          const frontSpokes = engineerSpokes.filter(
            ({ row }) => row.side === frontSide
          );
          const hoveredRear = rearSpokes.find(({ row }) => row.spoke === hoveredSpoke);
          return (
            <>
              <defs>
                {occlusion && (
                  <mask id={rearMaskId}>
                    <rect
                      x="-220"
                      y="-220"
                      width="440"
                      height="440"
                      fill="#fff"
                    />
                    <circle cx={0} cy={0} r={hubBodyRadius} fill="#000" />
                  </mask>
                )}
              </defs>
              {showRearFlange && (
                <circle
                  cx={0}
                  cy={0}
                  r={rearFlangeRadius}
                  fill="none"
                  stroke="#cbd5f5"
                  strokeWidth={1.1}
                />
              )}
              {showRearSpokes && (
                <g
                  mask={occlusion ? `url(#${rearMaskId})` : undefined}
                  opacity={0.45}
                >
                  {rearSpokes.map(({ element }) => element)}
                </g>
              )}
              {showRearSpokes && hoveredRear && (
                <g mask={occlusion ? `url(#${rearMaskId})` : undefined}>
                  {hoveredRear.element}
                </g>
              )}
              <circle cx={0} cy={0} r={hubBodyRadius} fill="#e2e8f0" />
              <circle
                cx={0}
                cy={0}
                r={frontFlangeRadius}
                fill="none"
                stroke={frontSide === "DS" ? "#64748b" : "#94a3b8"}
                strokeWidth={1.6}
              />
              <text
                x={frontFlangeRadius + 10}
                y={-8}
                fontSize={10}
                fill="#334155"
              >
                {frontSide}
              </text>
              <text
                x={-rearFlangeRadius - 18}
                y={-8}
                fontSize={10}
                fill="#94a3b8"
              >
                {rearSide}
              </text>
              {frontSpokes.map(({ element }) => element)}
            </>
          );
        })()
      ) : view === "realistic" && occlusion ? (
        <g mask={`url(#${occlusionId})`}>{spokeElements}</g>
      ) : (
        spokeElements
      )}

      {view === "realistic" && occlusion && (
        <circle cx={0} cy={0} r={hubBodyRadius} fill="#e2e8f0" />
      )}

      <circle
        cx={0}
        cy={0}
        r={RIM_RADIUS}
        fill="none"
        stroke="#475569"
        strokeWidth={2.2}
      />
      {view !== "engineer" && (
        <>
          <circle
            cx={HUB_OFFSET}
            cy={0}
            r={dsFlangeRadius}
            fill="none"
            stroke="#64748b"
            strokeWidth={1.6}
          />
          <circle
            cx={-HUB_OFFSET}
            cy={0}
            r={ndsFlangeRadius}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.3}
          />
          <circle cx={0} cy={0} r={6} fill="#0f172a" />

          <text
            x={HUB_OFFSET + dsFlangeRadius + 10}
            y={-8}
            fontSize={10}
            fill="#334155"
          >
            DS
          </text>
          <text
            x={-HUB_OFFSET - ndsFlangeRadius - 18}
            y={-8}
            fontSize={10}
            fill="#334155"
          >
            NDS
          </text>
        </>
      )}

      {showLabels && (
        <g>
          <line
            x1={0}
            y1={-190}
            x2={0}
            y2={-RIM_RADIUS - 6}
            stroke="#94a3b8"
            strokeWidth={1.2}
            markerEnd="url(#diagram-arrow)"
          />
          <text x={0} y={-202} textAnchor="middle" fontSize={10} fill="#64748b">
            Rim
          </text>

          {view !== "engineer" && (
            <>
              <line
                x1={HUB_OFFSET + dsFlangeRadius + 70}
                y1={-8}
                x2={HUB_OFFSET + dsFlangeRadius}
                y2={-8}
                stroke="#94a3b8"
                strokeWidth={1.2}
                markerEnd="url(#diagram-arrow)"
              />
              <text
                x={HUB_OFFSET + dsFlangeRadius + 74}
                y={-12}
                textAnchor="start"
                fontSize={10}
                fill="#64748b"
              >
                DS Hub
              </text>

              <line
                x1={-HUB_OFFSET - ndsFlangeRadius - 70}
                y1={-8}
                x2={-HUB_OFFSET - ndsFlangeRadius}
                y2={-8}
                stroke="#94a3b8"
                strokeWidth={1.2}
                markerEnd="url(#diagram-arrow)"
              />
              <text
                x={-HUB_OFFSET - ndsFlangeRadius - 74}
                y={-12}
                textAnchor="end"
                fontSize={10}
                fill="#64748b"
              >
                NDS Hub
              </text>
            </>
          )}

          <line
            x1={170}
            y1={60}
            x2={100}
            y2={22}
            stroke="#94a3b8"
            strokeWidth={1.2}
            markerEnd="url(#diagram-arrow)"
          />
          <text x={176} y={64} textAnchor="start" fontSize={10} fill="#64748b">
            Spoke
          </text>
          {view === "engineer" && (
            <>
              <text x={0} y={-176} textAnchor="middle" fontSize={9} fill="#64748b">
                Front: {lookFrom}
              </text>
              <text x={0} y={-164} textAnchor="middle" fontSize={9} fill="#94a3b8">
                Rear: {lookFrom === "DS" ? "NDS" : "DS"}
              </text>
            </>
          )}
        </g>
      )}

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
          dsFlangeRadius,
          hubRawDegDS(hole, hubStep) + baseAngleDS
        );
        const ndsPoint = pointOnCircle(
          ndsFlangeRadius,
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
        const rearSide = lookFrom === "DS" ? "NDS" : "DS";
        return (
          <g key={`hub-${hole}`}>
            {view === "engineer" ? (
              <>
                {(lookFrom === "DS" || showRearFlange) && (
                  <circle
                    cx={dsPoint.x}
                    cy={dsPoint.y}
                    r={
                      (hoveredDS ? 4.4 : 3.4) * ENGINEER_HUB_HOLE_SCALE
                    }
                    fill={hoveredDS ? "#0f172a" : "#475569"}
                    opacity={lookFrom === "DS" ? 1 : 0.5}
                  >
                    <title>DS hub hole {hole}</title>
                  </circle>
                )}
                {(lookFrom === "NDS" || showRearFlange) && (
                  <circle
                    cx={ndsPoint.x}
                    cy={ndsPoint.y}
                    r={
                      (hoveredNDS ? 4.2 : 3.2) * ENGINEER_HUB_HOLE_SCALE
                    }
                    fill={hoveredNDS ? "#0f172a" : "#64748b"}
                    opacity={lookFrom === "NDS" ? 1 : 0.5}
                  >
                    <title>NDS hub hole {hole}</title>
                  </circle>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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
            dsFlangeRadius + 10,
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
