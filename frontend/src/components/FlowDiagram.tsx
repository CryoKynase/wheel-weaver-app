import { useMemo, type Ref } from "react";

import type { PatternRequest, PatternRow } from "../lib/types";
import { effectiveStartRimHole } from "../lib/pattern";

type FlowDiagramProps = {
  params: PatternRequest;
  rows: PatternRow[];
  zoom: number;
  svgRef?: Ref<SVGSVGElement>;
};

type FlowNodeType = "start" | "phase" | "action" | "repeat" | "end";

type FlowNode = {
  id: string;
  type: FlowNodeType;
  title?: string;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
};

type FlowEdge = {
  from: string;
  to: string;
};

type LoopEdge = {
  from: string;
  to: string;
};

type FlowLayout = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  loops: LoopEdge[];
  width: number;
  height: number;
};

const NODE_WIDTH = 520;
const NODE_X = 80;
const LOOP_X_OFFSET = 150;
const GAP_Y = 50;

const TITLE_SIZE = 14;
const LINE_SIZE = 12;
const LINE_HEIGHT = 16;
const PADDING_Y = 14;
const MAX_CHARS = 40;

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) {
    lines.push(line);
  }
  return lines;
}

function normalizeLines(lines: string[]) {
  return lines.flatMap((line) => wrapText(line, MAX_CHARS));
}

function nodeHeight(lines: string[], hasTitle: boolean) {
  const textLines = lines.length;
  const titleHeight = hasTitle ? TITLE_SIZE + 6 : 0;
  return PADDING_Y * 2 + titleHeight + textLines * LINE_HEIGHT;
}

function modDiff(next: number, current: number, modulo: number) {
  const raw = (next - current + modulo) % modulo;
  return raw === 0 ? modulo : raw;
}

function valveRelativeRimHole(
  rimHole: number,
  valveRight: number,
  holes: number
) {
  return ((rimHole - valveRight + holes) % holes) + 1;
}

function buildFlowLayout(params: PatternRequest, rows: PatternRow[]): FlowLayout {
  const valveRight = effectiveStartRimHole(
    params.holes,
    params.startRimHole,
    params.valveReference
  );
  const valveLeft = ((valveRight - 2 + params.holes) % params.holes) + 1;
  const spokesPerSide = params.holes / 2;
  const referenceRows = rows.filter(
    (row) => row.side === "DS" && row.step === "R1"
  );
  const refLeft = referenceRows.find((row) =>
    row.notes.toLowerCase().includes("valve-left")
  );
  const refRight = referenceRows.find((row) =>
    row.notes.toLowerCase().includes("valve-right")
  );

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const loops: LoopEdge[] = [];
  let y = 40;

  const addNode = (node: Omit<FlowNode, "x" | "y" | "width" | "height">) => {
    const lines = normalizeLines(node.lines);
    const height = nodeHeight(lines, Boolean(node.title));
    const layoutNode: FlowNode = {
      ...node,
      lines,
      x: NODE_X,
      y,
      width: NODE_WIDTH,
      height,
    };
    nodes.push(layoutNode);
    y += height + GAP_Y;
    return layoutNode.id;
  };

  const valveRefLabel =
    params.valveReference === "right_of_valve"
      ? "Start rim hole is valve-right."
      : "Start rim hole is valve-left.";

  addNode({
    id: "start",
    type: "start",
    title: "Start",
    lines: [
      "View from the drive-side (cassette side), valve at 12 o'clock.",
      "Rim holes are numbered from valve-right = 1, increasing clockwise when viewed from the drive side.",
      "Hub holes are numbered 1..H per flange, clockwise when viewed from the drive side.",
      valveRefLabel,
      `Reference spokes: DS hub ${refLeft?.hubHole ?? "?"} at valve-left rim hole ${valveLeft}, then DS hub ${
        refRight?.hubHole ?? "?"
      } at valve-right rim hole ${valveRight}.`,
    ],
  });

  const ndsReferenceRows = rows.filter(
    (row) => row.side === "NDS" && row.step === "L1"
  );
  const ndsLeft = ndsReferenceRows.find((row) =>
    row.notes.toLowerCase().includes("valve-left")
  );
  const ndsRight = ndsReferenceRows.find((row) =>
    row.notes.toLowerCase().includes("valve-right")
  );

  const phases = [
    { id: "ds-odd", step: "R2", side: "DS", label: "Drive-side odd set" },
    { id: "ds-even", step: "R3", side: "DS", label: "Drive-side even set" },
    { id: "nds-odd", step: "L3", side: "NDS", label: "Non-drive odd set" },
    { id: "nds-even", step: "L4", side: "NDS", label: "Non-drive even set" },
  ];

  phases.forEach((phase) => {
    if (phase.id === "nds-odd") {
      addNode({
        id: "phase-nds-reference",
        type: "phase",
        title: "Non-drive reference spokes",
        lines: [
          `NDS - L1 - ${ndsReferenceRows.length || 2} spokes`,
          `Reference spokes: NDS hub ${
            ndsRight?.hubHole ?? "?"
          } at valve-right rim hole ${valveRight}, then NDS hub ${
            ndsLeft?.hubHole ?? "?"
          } at valve-left rim hole ${valveLeft}.`,
        ],
      });
    }

    const phaseRows = rows.filter(
      (row) => row.step === phase.step && row.side === phase.side
    );
    const sampleRows = phaseRows.slice(0, 3);
    const first = sampleRows[0];
    const second = sampleRows[1] ?? sampleRows[0];
    const actionCount = sampleRows.length;

    addNode({
      id: `phase-${phase.id}`,
      type: "phase",
      title: phase.label,
      lines: [
        `${phase.side} - ${phase.step} - ${phaseRows.length} spokes`,
        first ? first.crossesDescribed : "No spokes in this phase.",
      ],
    });

    let firstActionId: string | null = null;

    sampleRows.forEach((row, idx) => {
      const rimRel = valveRelativeRimHole(row.rimHole, valveRight, params.holes);
      const actionId = addNode({
        id: `action-${phase.id}-${idx + 1}`,
        type: "action",
        title: `Action ${idx + 1}`,
        lines: [
          `Spoke ${row.spoke} (${row.side}, heads ${row.heads})`,
          `Hub hole ${row.hubHole} -> rim hole ${rimRel} (valve +${rimRel - 1})`,
          row.notes,
        ],
      });
      if (!firstActionId) {
        firstActionId = actionId;
      }
    });

    const rimFirst = first
      ? valveRelativeRimHole(first.rimHole, valveRight, params.holes)
      : 1;
    const rimSecond = second
      ? valveRelativeRimHole(second.rimHole, valveRight, params.holes)
      : rimFirst;
    const deltaRim = modDiff(rimSecond, rimFirst, params.holes);
    const hubFirst = first?.hubHole ?? 1;
    const hubSecond = second?.hubHole ?? hubFirst;
    const deltaHub = modDiff(hubSecond, hubFirst, spokesPerSide);

    const repeatId = addNode({
      id: `repeat-${phase.id}`,
      type: "repeat",
      title: "Repeat",
      lines: [
        `Repeat for remaining ${Math.max(
          phaseRows.length - actionCount,
          0
        )} spokes in this phase.`,
        `Advance rim hole by +${deltaRim} and hub hole by +${deltaHub} (mod ${params.holes}/${spokesPerSide}).`,
      ],
    });

    if (firstActionId) {
      loops.push({ from: repeatId, to: firstActionId });
    }
  });

  addNode({
    id: "end",
    type: "end",
    title: "End",
    lines: ["All spokes placed. Proceed to tensioning/truing (not covered)."],
  });

  nodes.forEach((node, idx) => {
    const next = nodes[idx + 1];
    if (next) {
      edges.push({ from: node.id, to: next.id });
    }
  });

  const width = NODE_X + NODE_WIDTH + LOOP_X_OFFSET + 80;
  const height = y + 10;

  return { nodes, edges, loops, width, height };
}

function findNode(nodes: FlowNode[], id: string) {
  return nodes.find((node) => node.id === id);
}

export default function FlowDiagram({
  params,
  rows,
  zoom,
  svgRef,
}: FlowDiagramProps) {
  const layout = useMemo(() => buildFlowLayout(params, rows), [params, rows]);

  return (
    <svg
      ref={svgRef}
      className="block"
      width={layout.width * zoom}
      height={layout.height * zoom}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Wheel lacing flowchart"
    >
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
        </marker>
        <style>{`
          .flow-text { font-family: "Segoe UI", system-ui, sans-serif; fill: #0f172a; }
          .flow-node { stroke: #111827; stroke-width: 1.2; fill: #ffffff; }
          .flow-start { fill: #f8fafc; }
          .flow-phase { fill: #f1f5f9; stroke-width: 1.6; }
          .flow-action { fill: #ffffff; }
          .flow-repeat { fill: #fef9f2; stroke-dasharray: 4 3; }
          .flow-end { fill: #f8fafc; }
          .flow-edge { stroke: #1f2937; stroke-width: 1.4; fill: none; }
          .flow-loop { stroke: #1f2937; stroke-width: 1.6; fill: none; }
        `}</style>
      </defs>

      {layout.edges.map((edge) => {
        const from = findNode(layout.nodes, edge.from);
        const to = findNode(layout.nodes, edge.to);
        if (!from || !to) {
          return null;
        }
        const x = from.x + from.width / 2;
        const y1 = from.y + from.height;
        const y2 = to.y;
        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M ${x} ${y1 + 4} L ${x} ${y2 - 6}`}
            className="flow-edge"
            markerEnd="url(#flow-arrow)"
          />
        );
      })}

      {layout.loops.map((loop) => {
        const from = findNode(layout.nodes, loop.from);
        const to = findNode(layout.nodes, loop.to);
        if (!from || !to) {
          return null;
        }
        const startX = from.x + from.width;
        const startY = from.y + from.height / 2;
        const loopX = from.x + from.width + LOOP_X_OFFSET;
        const targetX = to.x + to.width / 2;
        const targetY = to.y - 8;
        const path = [
          `M ${startX} ${startY}`,
          `H ${loopX}`,
          `V ${targetY}`,
          `H ${targetX}`,
        ].join(" ");
        return (
          <g key={`${loop.from}-${loop.to}`}>
            <path
              d={path}
              className="flow-loop"
              markerEnd="url(#flow-arrow)"
            />
            <text
              x={loopX - 6}
              y={targetY - 6}
              textAnchor="end"
              className="flow-text"
              fontSize={LINE_SIZE}
            >
              repeat
            </text>
          </g>
        );
      })}

      {layout.nodes.map((node) => {
        const yText = node.y + PADDING_Y + TITLE_SIZE;
        const titleY = node.title ? node.y + PADDING_Y + TITLE_SIZE : 0;
        const linesOffset = node.title ? TITLE_SIZE + 10 : 0;
        const className = [
          "flow-node",
          node.type === "start" && "flow-start",
          node.type === "phase" && "flow-phase",
          node.type === "repeat" && "flow-repeat",
          node.type === "end" && "flow-end",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={10}
              className={className}
            />
            {node.title && (
              <text
                x={node.x + node.width / 2}
                y={titleY}
                textAnchor="middle"
                className="flow-text"
                fontSize={TITLE_SIZE}
                fontWeight={600}
              >
                {node.title}
              </text>
            )}
            {node.lines.map((line, idx) => (
              <text
                key={`${node.id}-line-${idx}`}
                x={node.x + node.width / 2}
                y={yText + linesOffset + idx * LINE_HEIGHT}
                textAnchor="middle"
                className="flow-text"
                fontSize={LINE_SIZE}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
