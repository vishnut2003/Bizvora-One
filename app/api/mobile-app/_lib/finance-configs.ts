import "server-only";
import SalesOrder from "@/models/sales-order";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseOrder from "@/models/purchase-order";
import PurchaseInvoice from "@/models/purchase-invoice";
import {
  PURCHASE_INVOICE_STATUSES,
  PURCHASE_ORDER_STATUSES,
  SALES_INVOICE_STATUSES,
  SALES_ORDER_STATUSES,
} from "@/lib/voucher";
import type { VoucherDocConfig } from "./finance";

export const SALES_ORDER_CONFIG: VoucherDocConfig = {
  model: SalesOrder,
  notFoundCode: "sales_order_not_found",
  prefix: "SO",
  side: "sales",
  isInvoice: false,
  statuses: SALES_ORDER_STATUSES,
  defaultStatus: "draft",
  primaryDateField: "orderDate",
  primaryDateRequiredError: "Order date is required.",
  secondaryDateField: "expectedDate",
  secondaryDateOrderError: "Expected date can't be before the order date.",
};

export const SALES_INVOICE_CONFIG: VoucherDocConfig = {
  model: SalesInvoice,
  notFoundCode: "sales_invoice_not_found",
  prefix: "SI",
  side: "sales",
  isInvoice: true,
  statuses: SALES_INVOICE_STATUSES,
  defaultStatus: "unpaid",
  primaryDateField: "invoiceDate",
  primaryDateRequiredError: "Invoice date is required.",
  secondaryDateField: "dueDate",
  secondaryDateOrderError: "Due date can't be before the invoice date.",
};

export const PURCHASE_ORDER_CONFIG: VoucherDocConfig = {
  model: PurchaseOrder,
  notFoundCode: "purchase_order_not_found",
  prefix: "PO",
  side: "purchase",
  isInvoice: false,
  statuses: PURCHASE_ORDER_STATUSES,
  defaultStatus: "draft",
  primaryDateField: "orderDate",
  primaryDateRequiredError: "Order date is required.",
  secondaryDateField: "expectedDate",
  secondaryDateOrderError: "Expected date can't be before the order date.",
};

export const PURCHASE_INVOICE_CONFIG: VoucherDocConfig = {
  model: PurchaseInvoice,
  notFoundCode: "purchase_invoice_not_found",
  prefix: "PI",
  side: "purchase",
  isInvoice: true,
  statuses: PURCHASE_INVOICE_STATUSES,
  defaultStatus: "unpaid",
  primaryDateField: "invoiceDate",
  primaryDateRequiredError: "Invoice date is required.",
  secondaryDateField: "dueDate",
  secondaryDateOrderError: "Due date can't be before the invoice date.",
  hasVendorBillNumber: true,
};
