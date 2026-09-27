// Server-side helpers turning buckets into chart props (formatting happens here, on the server).
import type { Bucket } from "@/lib/reports";
import type { AreaPoint } from "@/components/charts/AreaChart";
import type { ColumnSeries } from "@/components/charts/ColumnChart";
import { formatRs } from "@/lib/format";

export const toArea = (b: Bucket[]): AreaPoint[] =>
  b.map((x) => ({ key: x.key, label: x.label, value: x.total, display: formatRs(x.total), count: x.count }));

export const toLabels = (b: Bucket[]) => b.map((x) => ({ key: x.key, label: x.label }));

export const toSeries = (name: string, tone: ColumnSeries["tone"], b: Bucket[]): ColumnSeries => ({
  name,
  tone,
  values: b.map((x) => x.total),
  displays: b.map((x) => formatRs(x.total)),
});

export const sumOf = (b: Bucket[]) => b.reduce((s, x) => s + x.total, 0);
