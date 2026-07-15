import mongoose from "mongoose";
import Employee from "@/models/employee";
import Payslip from "@/models/payslip";
import { sumLines } from "@/lib/payroll";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  employeeToRawInput,
  parseEmployeeBody,
  requireEmployeeManager,
} from "../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; employeeId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, employeeId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireEmployeeManager(access);
  requireObjectId(employeeId);

  const employee = await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
  })
    .populate("linkedUser", "name email image")
    .lean();
  if (!employee) throw new MobileApiError(404, "employee_not_found");

  return ok({ employee: serialize(employee) });
});

export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, employeeId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireEmployeeManager(access);
  requireObjectId(employeeId);

  const body = await readJsonBody(req);

  const existing = await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
  });
  if (!existing) throw new MobileApiError(404, "employee_not_found");

  const d = parseEmployeeBody({
    ...employeeToRawInput(existing.toObject()),
    ...body,
  });

  const dupId = await Employee.findOne({
    workspace: workspaceId,
    empId: d.empId,
    _id: { $ne: employeeId },
  })
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
      _id: { $ne: employeeId },
    })
      .select("_id")
      .lean();
    if (dupLink) throw new MobileApiError(409, "user_already_linked");
  }

  existing.empId = d.empId;
  existing.name = d.name;
  existing.email = d.email || null;
  existing.phone = d.phone || null;
  existing.designation = d.designation;
  existing.department = d.department;
  existing.employmentType = d.employmentType;
  existing.dateOfJoining = d.dateOfJoining;
  existing.status = d.status;
  existing.linkedUser = d.linkedUser
    ? new mongoose.Types.ObjectId(d.linkedUser)
    : null;
  existing.salaryStructure =
    d.salaryStructure as typeof existing.salaryStructure;
  existing.currency = d.currency;
  existing.monthlyCtc = sumLines(d.salaryStructure.earnings);
  existing.notes = d.notes;

  // Editing the salary structure never touches existing payslips — those
  // hold a snapshot taken at run-generation time.
  try {
    await existing.save();
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      throw new MobileApiError(409, "duplicate_employee");
    }
    throw err;
  }

  return ok({ employee: serialize(existing.toObject()) });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, employeeId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireEmployeeManager(access);
  requireObjectId(employeeId);

  const payslipCount = await Payslip.countDocuments({
    workspace: workspaceId,
    employee: employeeId,
  });
  if (payslipCount > 0) {
    throw new MobileApiError(409, "employee_has_payslips");
  }

  const result = await Employee.deleteOne({
    _id: employeeId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    throw new MobileApiError(404, "employee_not_found");
  }

  return ok();
});
