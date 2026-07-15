import type { FilterQuery } from "mongoose";
import Employee, { type IEmployee } from "@/models/employee";
import { EMPLOYEE_STATUSES, type EmployeeStatus } from "@/lib/payroll";
import { sumLines } from "@/lib/payroll";
import { escapeRegex } from "@/lib/voucher";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  parseSort,
  readJsonBody,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import { parseEmployeeBody, requireEmployeeManager } from "../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

// The web employees area is owner/admin/hr only — reads included.
export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireEmployeeManager(access);

  const url = new URL(req.url);
  const pagination = parsePagination(url);
  const sort = parseSort(url, ["createdAt", "updatedAt", "name", "empId"], {
    createdAt: -1,
  });

  const filter: FilterQuery<IEmployee> = { workspace: workspaceId };

  const status = url.searchParams.get("status") ?? "";
  if ((EMPLOYEE_STATUSES as readonly string[]).includes(status)) {
    filter.status = status as EmployeeStatus;
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length > 0) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { name: re },
      { empId: re },
      { email: re },
      { designation: re },
      { department: re },
    ];
  }

  const [docs, total] = await Promise.all([
    Employee.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  return ok(listEnvelope(docs, pagination, total));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireEmployeeManager(access);

  const body = await readJsonBody(req);
  const d = parseEmployeeBody(body);

  // Friendly pre-checks before relying on the unique indexes.
  const dupId = await Employee.findOne({ workspace: workspaceId, empId: d.empId })
    .select("_id")
    .lean();
  if (dupId) {
    throw new MobileApiError(422, "validation_failed", {
      empId: "An employee with this ID already exists.",
    });
  }
  if (d.linkedUser) {
    const dupLink = await Employee.findOne({
      workspace: workspaceId,
      linkedUser: d.linkedUser,
    })
      .select("_id")
      .lean();
    if (dupLink) throw new MobileApiError(409, "user_already_linked");
  }

  try {
    const employee = await Employee.create({
      workspace: workspaceId,
      empId: d.empId,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      designation: d.designation,
      department: d.department,
      employmentType: d.employmentType,
      dateOfJoining: d.dateOfJoining,
      status: d.status,
      linkedUser: d.linkedUser,
      salaryStructure: d.salaryStructure,
      currency: d.currency,
      monthlyCtc: sumLines(d.salaryStructure.earnings),
      notes: d.notes,
      createdBy: access.userId,
    });
    return ok({ employee: serialize(employee.toObject()) }, 201);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      throw new MobileApiError(409, "duplicate_employee");
    }
    throw err;
  }
});
