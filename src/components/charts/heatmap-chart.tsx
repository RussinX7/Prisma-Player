"use client";

import { motion } from "motion/react";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface HeatmapBin {
  /** Índice da linha (0–6 para dias da semana). */
  bin: number;
  /** Contagem bruta do dia. */
  count: number;
  date: Date;
}

export interface HeatmapColumn {
  /** Índice da coluna (semana). */
  bin: number;
  bins: HeatmapBin[];
}

export interface HeatmapLevelStyle {
  color: string;
  fillMode?: "solid" | "pattern";
  pattern?: "diagonal" | "dots";
  patternColor?: string;
}

export type HeatmapLevelStyles = readonly HeatmapLevelStyle[];

export const HEATMAP_DEFAULT_LEVEL_STYLES: HeatmapLevelStyles = [
  { color: "var(--chart-scale-01)", fillMode: "solid" },
  { color: "var(--chart-scale-02)", fillMode: "solid" },
  { color: "var(--chart-scale-03)", fillMode: "solid" },
  { color: "var(--chart-scale-04)", fillMode: "solid" },
  { color: "var(--chart-scale-05)", fillMode: "solid" },
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Os cinco níveis visuais são quantis relativos ao pico da série, não valores
 * absolutos: uma VSL com 20 plays/dia e outra com 20 mil precisam produzir o
 * mesmo contraste. `max` de 0 devolve sempre o nível vazio.
 */
export function getHeatmapContributionLevel(count: number, max = 4): number {
  if (count <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

interface HeatmapInteractionValue {
  activeLevel: number | null;
  setActiveLevel: (level: number | null) => void;
}

const HeatmapInteractionContext = createContext<HeatmapInteractionValue>({
  activeLevel: null,
  setActiveLevel: () => {},
});

/** Mantém chart e legenda com o mesmo nível destacado. */
export function HeatmapInteractionProvider({ children }: { children: ReactNode }) {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const value = useMemo(() => ({ activeLevel, setActiveLevel }), [activeLevel]);
  return (
    <HeatmapInteractionContext.Provider value={value}>
      {children}
    </HeatmapInteractionContext.Provider>
  );
}

export function HeatmapInteractionBoundary({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setActiveLevel } = useContext(HeatmapInteractionContext);
  return (
    <div className={className} onMouseLeave={() => setActiveLevel(null)}>
      {children}
    </div>
  );
}

interface HeatmapContextValue {
  columns: HeatmapColumn[];
  levelStyles: HeatmapLevelStyles;
  maxCount: number;
  gap: number;
  weekStartDay: number;
  hovered: { column: number; row: number } | null;
  setHovered: (cell: { column: number; row: number } | null) => void;
  formatLabel: (count: number, date: Date) => string;
}

const HeatmapContext = createContext<HeatmapContextValue | null>(null);

function useHeatmap(): HeatmapContextValue {
  const context = useContext(HeatmapContext);
  if (!context) {
    throw new Error("Os componentes de heatmap precisam estar dentro de <HeatmapChart>.");
  }
  return context;
}

export interface HeatmapChartProps {
  data: HeatmapColumn[];
  levelStyles?: HeatmapLevelStyles;
  /** Espaço entre células em px. Default: 3 */
  gap?: number;
  /** Primeira linha da grade (0 = domingo). Default: 0 */
  weekStartDay?: number;
  /** Texto do tooltip. Default: "N plays em <data>". */
  formatLabel?: (count: number, date: Date) => string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function HeatmapChart({
  data,
  levelStyles = HEATMAP_DEFAULT_LEVEL_STYLES,
  gap = 3,
  weekStartDay = 0,
  formatLabel = (count, date) =>
    `${count} ${count === 1 ? "play" : "plays"} em ${date.toLocaleDateString("pt-BR")}`,
  className,
  style,
  children,
}: HeatmapChartProps) {
  const [hovered, setHovered] = useState<{ column: number; row: number } | null>(null);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const column of data) {
      for (const bin of column.bins) {
        if (bin.count > max) max = bin.count;
      }
    }
    return max;
  }, [data]);

  const value = useMemo<HeatmapContextValue>(
    () => ({
      columns: data,
      levelStyles,
      maxCount,
      gap,
      weekStartDay,
      hovered,
      setHovered,
      formatLabel,
    }),
    [data, levelStyles, maxCount, gap, weekStartDay, hovered, formatLabel],
  );

  return (
    <HeatmapContext.Provider value={value}>
      <div className={cn("relative w-full", className)} style={style}>
        {children}
      </div>
    </HeatmapContext.Provider>
  );
}

/** Rótulos de mês no topo, alinhados à coluna em que o mês começa. */
export function HeatmapXAxis({ className }: { className?: string }) {
  const { columns, gap } = useHeatmap();

  const monthStarts = useMemo(() => {
    const seen = new Set<number>();
    return columns.flatMap((column, index) => {
      const first = column.bins.find((bin) => bin.count >= 0);
      if (!first) return [];
      const month = first.date.getMonth();
      if (seen.has(month)) return [];
      seen.add(month);
      return [{ index, label: MONTH_LABELS[month] ?? "" }];
    });
  }, [columns]);

  return (
    <div
      className={cn("relative mb-1 h-4 text-[10px] text-[#7a7a7a] dark:text-[#a1a1a6]", className)}
      style={{ marginLeft: 32 }}
      aria-hidden
    >
      {monthStarts.map((month) => (
        <span
          key={`${month.label}-${month.index}`}
          className="absolute top-0 whitespace-nowrap"
          style={{ left: `calc(${month.index} * (var(--heatmap-cell) + ${gap}px))` }}
        >
          {month.label}
        </span>
      ))}
    </div>
  );
}

/** Rótulos de dia da semana à esquerda. Mostra dias alternados para não empilhar. */
export function HeatmapYAxis({ className }: { className?: string }) {
  const { gap, weekStartDay } = useHeatmap();
  return (
    <div
      className={cn("flex shrink-0 flex-col text-[10px] text-[#7a7a7a] dark:text-[#a1a1a6]", className)}
      style={{ gap: `${gap}px`, width: 32 }}
      aria-hidden
    >
      {Array.from({ length: 7 }, (_, row) => (
        <span
          key={row}
          className="flex items-center"
          style={{ height: "var(--heatmap-cell)" }}
        >
          {row % 2 === 1 ? WEEKDAY_LABELS[(row + weekStartDay) % 7] : ""}
        </span>
      ))}
    </div>
  );
}

export interface HeatmapCellsProps {
  cornerRadius?: number;
  /** Opacidade das células de outros níveis enquanto há hover. Default: 0.3 */
  inactiveOpacity?: number;
  className?: string;
}

export function HeatmapCells({
  cornerRadius = 3,
  inactiveOpacity = 0.3,
  className,
}: HeatmapCellsProps) {
  const {
    columns,
    levelStyles,
    maxCount,
    gap,
    hovered,
    setHovered,
    formatLabel,
  } = useHeatmap();
  const { activeLevel, setActiveLevel } = useContext(HeatmapInteractionContext);

  const resolveLevel = useCallback(
    (count: number) => getHeatmapContributionLevel(count, maxCount),
    [maxCount],
  );

  return (
    <div className={cn("flex min-w-0 flex-1", className)} style={{ gap: `${gap}px` }}>
      {columns.map((column, columnIndex) => (
        <div
          key={column.bin}
          className="flex flex-1 flex-col"
          style={{ gap: `${gap}px` }}
        >
          {column.bins.map((bin) => {
            const level = resolveLevel(bin.count);
            const style = levelStyles[level] ?? levelStyles[0]!;
            const dimmed = activeLevel !== null && activeLevel !== level;
            const isHovered =
              hovered?.column === columnIndex && hovered?.row === bin.bin;

            return (
              <motion.div
                key={`${column.bin}-${bin.bin}`}
                title={formatLabel(bin.count, bin.date)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: dimmed ? inactiveOpacity : 1,
                  scale: 1,
                }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(columnIndex * 0.012, 0.6),
                }}
                onMouseEnter={() => {
                  setHovered({ column: columnIndex, row: bin.bin });
                  setActiveLevel(level);
                }}
                onMouseLeave={() => setHovered(null)}
                style={{
                  height: "var(--heatmap-cell)",
                  borderRadius: cornerRadius,
                  background: style.color,
                  outline: isHovered ? "1.5px solid var(--prisma-blue, #0066cc)" : "none",
                  outlineOffset: 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Painel com o valor da célula sob o cursor. */
export function HeatmapTooltip({ className }: { className?: string }) {
  const { columns, hovered, formatLabel } = useHeatmap();
  if (!hovered) return null;

  const bin = columns[hovered.column]?.bins.find((item) => item.bin === hovered.row);
  if (!bin) return null;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none mt-2 inline-flex rounded-lg border px-3 py-1.5 text-[12px] shadow-sm",
        "border-[#e0e0e0] bg-white text-[#1d1d1f] dark:border-white/10 dark:bg-[#252527] dark:text-white",
        className,
      )}
    >
      {formatLabel(bin.count, bin.date)}
    </div>
  );
}

export interface HeatmapLegendProps {
  lessLabel?: string;
  moreLabel?: string;
  cellSize?: number;
  gap?: number;
  cornerRadius?: number;
  levelStyles?: HeatmapLevelStyles;
  inactiveOpacity?: number;
  className?: string;
}

export function HeatmapLegend({
  lessLabel = "Menos",
  moreLabel = "Mais",
  cellSize = 11,
  gap = 3,
  cornerRadius = 3,
  levelStyles = HEATMAP_DEFAULT_LEVEL_STYLES,
  inactiveOpacity = 0.3,
  className,
}: HeatmapLegendProps) {
  const { activeLevel, setActiveLevel } = useContext(HeatmapInteractionContext);

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 text-[11px] text-[#7a7a7a] dark:text-[#a1a1a6]",
        className,
      )}
    >
      <span>{lessLabel}</span>
      <div className="flex items-center" style={{ gap: `${gap}px` }}>
        {levelStyles.map((style, level) => (
          <button
            key={level}
            type="button"
            aria-label={`Nível ${level}`}
            onMouseEnter={() => setActiveLevel(level)}
            onMouseLeave={() => setActiveLevel(null)}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: cornerRadius,
              background: style.color,
              opacity: activeLevel !== null && activeLevel !== level ? inactiveOpacity : 1,
              transition: "opacity 150ms ease",
            }}
          />
        ))}
      </div>
      <span>{moreLabel}</span>
    </div>
  );
}

/**
 * Converte uma série diária em colunas semanais alinhadas ao dia da semana,
 * preenchendo os dias sem dado com zero para a grade não ficar furada.
 */
export function buildHeatmapColumns(
  points: { date: string; value: number }[],
  weekStartDay = 0,
): HeatmapColumn[] {
  if (!points.length) return [];

  const byDay = new Map<string, number>();
  for (const point of points) {
    const key = point.date.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + point.value);
  }

  const dates = [...byDay.keys()].sort();
  const first = new Date(`${dates[0]}T00:00:00`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00`);

  // Recua até o início da semana para a primeira coluna ficar completa.
  const start = new Date(first);
  const offset = (start.getDay() - weekStartDay + 7) % 7;
  start.setDate(start.getDate() - offset);

  const columns: HeatmapColumn[] = [];
  let cursor = new Date(start);
  let columnIndex = 0;

  while (cursor <= last) {
    const bins: HeatmapBin[] = [];
    for (let row = 0; row < 7; row++) {
      const date = new Date(cursor);
      date.setDate(date.getDate() + row);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      bins.push({ bin: row, count: byDay.get(key) ?? 0, date });
    }
    columns.push({ bin: columnIndex, bins });
    columnIndex += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return columns;
}
