"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Fixed hex palette (Recharts renders to SVG and can't read Tailwind classes),
// kept in step with the app's status colors:
//   done → emerald-500, pending → amber-500, overdue → rose-500,
//   created → indigo-500, completed → emerald-500.
const COLOR = {
  done: "#10b981",
  pending: "#f59e0b",
  overdue: "#f43f5e",
  created: "#6366f1",
  completed: "#10b981",
} as const;

const AXIS = "#a1a1aa"; // zinc-400 — legible on both light and dark surfaces
const GRID = "#e4e4e733"; // zinc-200 @ ~20% — faint in light, invisible-ish in dark

export type ProjectBar = {
  projectName: string;
  done: number;
  pending: number;
  overdue: number;
};

export type ActivityPoint = {
  month: string;
  created: number;
  completed: number;
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  background: "#ffffff",
  fontSize: 12,
  color: "#18181b",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
} as const;

/** Per-project completed vs. pending vs. overdue task counts. */
export function ProjectTasksBarChart({ data }: { data: ProjectBar[] }) {
  return (
    <div className="px-2 pb-4 pt-5 sm:px-4">
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 44)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          barCategoryGap={data.length > 1 ? "24%" : "40%"}
        >
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: AXIS }}
            stroke={GRID}
          />
          <YAxis
            type="category"
            dataKey="projectName"
            width={140}
            tick={{ fontSize: 11, fill: AXIS }}
            stroke={GRID}
          />
          <Tooltip
            cursor={{ fill: "#71717a1a" }}
            contentStyle={tooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar
            dataKey="done"
            name="Completed"
            stackId="tasks"
            fill={COLOR.done}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            stackId="tasks"
            fill={COLOR.pending}
          />
          <Bar
            dataKey="overdue"
            name="Overdue"
            stackId="tasks"
            fill={COLOR.overdue}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tasks created vs. completed per month. */
export function TaskActivityLineChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="px-2 pb-4 pt-5 sm:px-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: AXIS }}
            stroke={GRID}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: AXIS }}
            stroke={GRID}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="created"
            name="Created"
            stroke={COLOR.created}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke={COLOR.completed}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
