"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface FunnelGradientStop {
  offset: string;
  color: string;
}

export interface FunnelStage {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
  gradient?: FunnelGradientStop[];
}

export interface GridConfig {
  bands?: boolean;
  bandColor?: string;
  lines?: boolean;
  lineColor?: string;
  lineOpacity?: number;
  lineWidth?: number;
}

export interface FunnelChartProps {
  data: FunnelStage[];
  orientation?: "horizontal" | "vertical";
  color?: string;
  layers?: number;
  edges?: "curved" | "straight";
  gap?: number;
  staggerDelay?: number;
  showPercentage?: boolean;
  showValues?: boolean;
  showLabels?: boolean;
  formatPercentage?: (pct: number) => string;
  formatValue?: (value: number) => string;
  labelLayout?: "spread" | "grouped";
  labelOrientation?: "vertical" | "horizontal";
  labelAlign?: "center" | "start" | "end";
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  grid?: boolean | GridConfig;
  renderPattern?: (id: string, color: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FunnelChart({
  data,
  orientation = "horizontal",
  color = "var(--prisma-blue, #0066cc)",
  layers = 3,
  edges = "curved",
  gap = 4,
  staggerDelay = 0.12,
  showPercentage = true,
  showValues = true,
  showLabels = true,
  formatPercentage = (pct) => `${Math.round(pct)}%`,
  formatValue = (val) => val.toLocaleString(),
  hoveredIndex: controlledHoveredIndex,
  onHoverChange,
  className,
  style,
}: FunnelChartProps) {
  const [localHoveredIndex, setLocalHoveredIndex] = useState<number | null>(null);
  const activeHoveredIndex = controlledHoveredIndex !== undefined ? controlledHoveredIndex : localHoveredIndex;

  const handleHover = (index: number | null) => {
    setLocalHoveredIndex(index);
    onHoverChange?.(index);
  };

  const maxValue = useMemo(() => {
    if (!data.length) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  // Dimensions
  const chartHeight = 320;
  const chartWidth = 800;

  const segments = useMemo(() => {
    const totalSegments = data.length;
    if (totalSegments === 0) return [];

    const isHorizontal = orientation === "horizontal";
    const totalGaps = (totalSegments - 1) * gap;
    const segmentLength = ((isHorizontal ? chartWidth : chartHeight) - totalGaps) / totalSegments;

    return data.map((stage, index) => {
      const valuePct = stage.value / maxValue;
      const prevStage = data[index - 1];
      const prevValuePct = prevStage ? prevStage.value / maxValue : valuePct;

      const currentSize = 100 * valuePct;
      const prevSize = 100 * prevValuePct;

      // Calculate path coords relative to a 0-100 vertical height box for each segment
      // horizontal flow: X goes from start to end, Y scales symmetrically
      const segmentStart = index * (segmentLength + gap);
      const segmentEnd = segmentStart + segmentLength;

      const yTopStart = 50 - prevSize / 2;
      const yBottomStart = 50 + prevSize / 2;
      const yTopEnd = 50 - currentSize / 2;
      const yBottomEnd = 50 + currentSize / 2;

      let path = "";
      if (isHorizontal) {
        if (edges === "curved") {
          const cpX = (segmentStart + segmentEnd) / 2;
          path = `
            M ${segmentStart} ${(yTopStart / 100) * chartHeight}
            C ${cpX} ${(yTopStart / 100) * chartHeight}, ${cpX} ${(yTopEnd / 100) * chartHeight}, ${segmentEnd} ${(yTopEnd / 100) * chartHeight}
            L ${segmentEnd} ${(yBottomEnd / 100) * chartHeight}
            C ${cpX} ${(yBottomEnd / 100) * chartHeight}, ${cpX} ${(yBottomStart / 100) * chartHeight}, ${segmentStart} ${(yBottomStart / 100) * chartHeight}
            Z
          `;
        } else {
          path = `
            M ${segmentStart} ${(yTopStart / 100) * chartHeight}
            L ${segmentEnd} ${(yTopEnd / 100) * chartHeight}
            L ${segmentEnd} ${(yBottomEnd / 100) * chartHeight}
            L ${segmentStart} ${(yBottomStart / 100) * chartHeight}
            Z
          `;
        }
      } else {
        // Vertical flow: Y goes from start to end, X scales symmetrically
        const xLeftStart = 50 - prevSize / 2;
        const xRightStart = 50 + prevSize / 2;
        const xLeftEnd = 50 - currentSize / 2;
        const xRightEnd = 50 + currentSize / 2;

        if (edges === "curved") {
          const cpY = (segmentStart + segmentEnd) / 2;
          path = `
            M ${(xLeftStart / 100) * chartWidth} ${segmentStart}
            C ${(xLeftStart / 100) * chartWidth} ${cpY}, ${(xLeftEnd / 100) * chartWidth} ${cpY}, ${(xLeftEnd / 100) * chartWidth} ${segmentEnd}
            L ${(xRightEnd / 100) * chartWidth} ${segmentEnd}
            C ${(xRightEnd / 100) * chartWidth} ${cpY}, ${(xRightStart / 100) * chartWidth} ${cpY}, ${(xRightStart / 100) * chartWidth} ${segmentStart}
            Z
          `;
        } else {
          path = `
            M ${(xLeftStart / 100) * chartWidth} ${segmentStart}
            L ${(xLeftEnd / 100) * chartWidth} ${segmentEnd}
            L ${(xRightEnd / 100) * chartWidth} ${segmentEnd}
            L ${(xRightStart / 100) * chartWidth} ${segmentStart}
            Z
          `;
        }
      }

      const conversionRate = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;

      return {
        stage,
        index,
        path,
        segmentStart,
        segmentEnd,
        conversionRate,
        yTopEnd: (yTopEnd / 100) * chartHeight,
        yBottomEnd: (yBottomEnd / 100) * chartHeight,
        yCenterEnd: 50,
      };
    });
  }, [data, maxValue, orientation, edges, gap]);

  return (
    <div
      className={cn("relative w-full select-none flex flex-col items-center", className)}
      style={style}
    >
      <div className="relative w-full h-[340px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {data.map((stage, i) => {
              const segColor = stage.color || color;
              return (
                <linearGradient
                  key={i}
                  id={`funnel-grad-${i}`}
                  x1="0"
                  y1="0"
                  x2={orientation === "horizontal" ? "1" : "0"}
                  y2={orientation === "horizontal" ? "0" : "1"}
                >
                  {stage.gradient ? (
                    stage.gradient.map((stop, sIdx) => (
                      <stop key={sIdx} offset={stop.offset} stopColor={stop.color} />
                    ))
                  ) : (
                    <>
                      <stop offset="0%" stopColor={segColor} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={segColor} stopOpacity={0.55} />
                    </>
                  )}
                </linearGradient>
              );
            })}
          </defs>

          {/* Halo Rings & Segments */}
          {segments.map((seg, i) => {
            const isHovered = activeHoveredIndex === i;
            const anyHovered = activeHoveredIndex !== null;
            const segColor = seg.stage.color || color;

            // Halo configuration
            const haloScales = Array.from({ length: layers }, (_, lIdx) => 1 + (lIdx + 1) * 0.05);

            return (
              <g
                key={i}
                onMouseEnter={() => handleHover(i)}
                onMouseLeave={() => handleHover(null)}
                className="cursor-pointer"
              >
                {/* Concentric Halo Rings (renders only when hovered or always with low opacity) */}
                {haloScales.map((scale, lIdx) => (
                  <motion.path
                    key={lIdx}
                    d={seg.path}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{
                      scale: isHovered ? scale : 1,
                      opacity: isHovered ? 0.15 / (lIdx + 1) : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 15,
                    }}
                    style={{
                      originX: orientation === "horizontal" ? `${(seg.segmentStart + seg.segmentEnd) / (2 * chartWidth)}` : 0.5,
                      originY: orientation === "horizontal" ? 0.5 : `${(seg.segmentStart + seg.segmentEnd) / (2 * chartHeight)}`,
                    }}
                    fill="none"
                    stroke={segColor}
                    strokeWidth={4 / (lIdx + 1)}
                  />
                ))}

                {/* Primary Segment Solid Shape */}
                <motion.path
                  d={seg.path}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{
                    scaleY: anyHovered && !isHovered ? 0.92 : 1,
                    scaleX: anyHovered && !isHovered ? 0.96 : 1,
                    opacity: anyHovered && !isHovered ? 0.45 : 1,
                  }}
                  transition={{
                    delay: i * staggerDelay,
                    type: "spring",
                    stiffness: 100,
                    damping: 16,
                  }}
                  fill={`url(#funnel-grad-${i})`}
                  className="transition-all duration-300"
                />

                {/* Inner Overlay Border */}
                <motion.path
                  d={seg.path}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isHovered ? 0.9 : 0.15,
                  }}
                  fill="none"
                  stroke={segColor}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                />
              </g>
            );
          })}
        </svg>

        {/* Labels Overlay */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-4">
          {segments.map((seg, i) => {
            const isHovered = activeHoveredIndex === i;
            const percent = seg.conversionRate;
            const isHorizontal = orientation === "horizontal";

            // Placement calculations
            const widthPct = (1 / data.length) * 100;
            const leftOffset = (seg.segmentStart / chartWidth) * 100;
            const sizePct = (seg.segmentEnd - seg.segmentStart) / chartWidth * 100;

            return (
              <div
                key={i}
                className="absolute flex flex-col justify-center items-center text-center transition-all duration-300"
                style={{
                  left: isHorizontal ? `${leftOffset}%` : "0%",
                  top: isHorizontal ? "0%" : `${leftOffset}%`,
                  width: isHorizontal ? `${sizePct}%` : "100%",
                  height: isHorizontal ? "100%" : `${sizePct}%`,
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
              >
                {/* Badge Percentage */}
                {showPercentage && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * staggerDelay + 0.1 }}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm transition-colors",
                      isHovered
                        ? "bg-prisma-blue text-white"
                        : "bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {formatPercentage(percent)}
                  </motion.span>
                )}

                {/* Value Label */}
                {showValues && (
                  <strong className="mt-1 text-[14px] font-bold text-slate-800 dark:text-white leading-tight">
                    {seg.stage.displayValue || formatValue(seg.stage.value)}
                  </strong>
                )}

                {/* Label */}
                {showLabels && (
                  <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc] font-semibold tracking-tight mt-0.5 truncate max-w-full">
                    {seg.stage.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
