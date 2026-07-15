import "server-only";
import mongoose from "mongoose";
import Lead from "@/models/lead";
import Customer from "@/models/customer";
import Quotation from "@/models/quotation";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseInvoice from "@/models/purchase-invoice";
import Receipt from "@/models/receipt";
import Project from "@/models/project";
import Task from "@/models/task";
import Employee from "@/models/employee";
import PayrollRun from "@/models/payroll-run";
import { OPEN_LEAD_STAGES, canViewLeads, canViewAllLeads } from "@/lib/lead";
import { canViewProjects, canViewAllProjects } from "@/lib/project";
import { canViewVouchers } from "@/lib/voucher";
import { canViewPayroll } from "@/lib/payroll";
import type { UserRole } from "@/lib/user";

export type MobileOverview = {
  sales?: {
    openLeads: number;
    wonThisMonth: number;
    pipelineValue: number;
    leadsByStage: Record<string, number>;
    overdueFollowUps: number;
    customers: number;
    newCustomersThisMonth: number;
    mineOnly: boolean;
  };
  finance?: {
    receivablesOutstanding: number;
    payablesOutstanding: number;
    collectedThisMonth: number;
    overdueInvoices: number;
    quotationsThisMonth: number;
  };
  projects?: {
    activeProjects: number;
    myOpenTasks: number;
    myOverdueTasks: number;
    mineOnly: boolean;
  };
  hr?: {
    activeEmployees: number;
    latestPayrollRun: {
      id: string;
      periodMonth: number;
      periodYear: number;
      status: string;
      netTotal: number;
    } | null;
  };
};

// Role-scoped dashboard summary for the mobile home screen. Mirrors the
// headline metrics of the web overview widgets (see
// app/workspace/[workspaceId]/_components/*-overview.tsx) in compact form.
export async function getMobileOverview(
  workspaceId: string,
  role: UserRole,
  userId: string,
): Promise<MobileOverview> {
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const overview: MobileOverview = {};
  const jobs: Promise<void>[] = [];

  if (canViewLeads(role)) {
    const mineOnly = !canViewAllLeads(role);
    const leadScope: Record<string, unknown> = { workspace: workspaceId };
    const leadScopeAgg: Record<string, unknown> = { workspace: wsObj };
    if (mineOnly) {
      leadScope.assignedTo = userId;
      leadScopeAgg.assignedTo = new mongoose.Types.ObjectId(userId);
    }

    jobs.push(
      (async () => {
        const [
          stageAgg,
          openLeads,
          wonThisMonth,
          pipelineAgg,
          overdueFollowUps,
          customers,
          newCustomersThisMonth,
        ] = await Promise.all([
          Lead.aggregate<{ _id: string; count: number }>([
            { $match: leadScopeAgg },
            { $group: { _id: "$stage", count: { $sum: 1 } } },
          ]),
          Lead.countDocuments({
            ...leadScope,
            stage: { $in: OPEN_LEAD_STAGES },
          }),
          Lead.countDocuments({
            ...leadScope,
            stage: "won",
            updatedAt: { $gte: monthStart },
          }),
          Lead.aggregate<{ total: number }>([
            { $match: { ...leadScopeAgg, stage: { $in: OPEN_LEAD_STAGES } } },
            { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
          ]),
          Lead.countDocuments({
            ...leadScope,
            stage: { $in: OPEN_LEAD_STAGES },
            nextFollowUpAt: { $ne: null, $lt: now },
          }),
          Customer.countDocuments(
            mineOnly
              ? { workspace: workspaceId, assignedTo: userId }
              : { workspace: workspaceId },
          ),
          Customer.countDocuments({
            workspace: workspaceId,
            createdAt: { $gte: monthStart },
            ...(mineOnly ? { assignedTo: userId } : {}),
          }),
        ]);

        overview.sales = {
          openLeads,
          wonThisMonth,
          pipelineValue: pipelineAgg[0]?.total ?? 0,
          leadsByStage: Object.fromEntries(
            stageAgg.map((s) => [s._id, s.count]),
          ),
          overdueFollowUps,
          customers,
          newCustomersThisMonth,
          mineOnly,
        };
      })(),
    );
  }

  if (canViewVouchers(role)) {
    jobs.push(
      (async () => {
        const [
          receivablesAgg,
          payablesAgg,
          collectedAgg,
          overdueInvoices,
          quotationsThisMonth,
        ] = await Promise.all([
          SalesInvoice.aggregate<{ owed: number }>([
            {
              $match: {
                workspace: wsObj,
                status: { $in: ["unpaid", "partial", "overdue"] },
              },
            },
            {
              $group: {
                _id: null,
                owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
              },
            },
          ]),
          PurchaseInvoice.aggregate<{ owed: number }>([
            {
              $match: {
                workspace: wsObj,
                status: { $in: ["unpaid", "partial", "overdue"] },
              },
            },
            {
              $group: {
                _id: null,
                owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
              },
            },
          ]),
          Receipt.aggregate<{ total: number }>([
            {
              $match: {
                workspace: wsObj,
                status: "cleared",
                receiptDate: { $gte: monthStart },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          SalesInvoice.countDocuments({
            workspace: workspaceId,
            status: "overdue",
          }),
          Quotation.countDocuments({
            workspace: workspaceId,
            createdAt: { $gte: monthStart },
          }),
        ]);

        overview.finance = {
          receivablesOutstanding: receivablesAgg[0]?.owed ?? 0,
          payablesOutstanding: payablesAgg[0]?.owed ?? 0,
          collectedThisMonth: collectedAgg[0]?.total ?? 0,
          overdueInvoices,
          quotationsThisMonth,
        };
      })(),
    );
  }

  if (canViewProjects(role)) {
    const mineOnly = !canViewAllProjects(role);
    jobs.push(
      (async () => {
        const projectFilter: Record<string, unknown> = {
          workspace: workspaceId,
          status: { $in: ["planning", "active"] },
        };
        if (mineOnly) projectFilter.team = userId;

        const [activeProjects, myOpenTasks, myOverdueTasks] =
          await Promise.all([
            Project.countDocuments(projectFilter),
            Task.countDocuments({
              workspace: workspaceId,
              assignee: userId,
              status: { $ne: "done" },
            }),
            Task.countDocuments({
              workspace: workspaceId,
              assignee: userId,
              status: { $ne: "done" },
              dueDate: { $ne: null, $lt: now },
            }),
          ]);

        overview.projects = {
          activeProjects,
          myOpenTasks,
          myOverdueTasks,
          mineOnly,
        };
      })(),
    );
  }

  if (canViewPayroll(role)) {
    jobs.push(
      (async () => {
        const [activeEmployees, latestRun] = await Promise.all([
          Employee.countDocuments({ workspace: workspaceId, status: "active" }),
          PayrollRun.findOne({ workspace: workspaceId })
            .sort({ periodYear: -1, periodMonth: -1 })
            .lean(),
        ]);

        overview.hr = {
          activeEmployees,
          latestPayrollRun: latestRun
            ? {
                id: String(latestRun._id),
                periodMonth: latestRun.periodMonth,
                periodYear: latestRun.periodYear,
                status: latestRun.status,
                netTotal: latestRun.netTotal ?? 0,
              }
            : null,
        };
      })(),
    );
  }

  await Promise.all(jobs);
  return overview;
}
