"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  QUOTATION_STATUS_LABEL,
  lineSubtotal,
  lineTax,
  type QuotationStatus,
} from "@/lib/quotation";

export type QuotationPdfCompany = {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  website: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  gstin: string;
  pan: string;
  cin: string;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    upiId: string;
  };
};

export type QuotationPdfData = {
  number: string;
  status: QuotationStatus;
  currency: string;
  issueDate: string;
  validUntil: string | null;
  recipient: {
    name: string;
    company: string;
    email: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  notes: string;
  terms: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    lineHeight: 1.45,
    color: "#18181b",
    fontFamily: "Helvetica",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerBar: {
    height: 6,
    width: 48,
    backgroundColor: "#8e51ff",
    marginBottom: 12,
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 1,
  },
  fromName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  fromLine: { fontSize: 9.5, color: "#475569", marginTop: 1.5 },
  rightCol: { alignItems: "flex-end", maxWidth: "46%" },
  numberValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  statusPill: {
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaRight: {
    fontSize: 9.5,
    color: "#475569",
    marginTop: 5,
    textAlign: "right",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 24,
  },
  billBlock: { flex: 1 },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94a3b8",
    marginBottom: 4,
  },
  value: { fontSize: 10.5, color: "#0f172a" },
  valueMuted: { fontSize: 9.5, color: "#475569", marginTop: 1.5 },

  table: { marginTop: 4 },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  cellHeader: {
    color: "#64748b",
    fontSize: 8.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
  },
  cellDesc: { flex: 4, fontSize: 10 },
  cellQty: { flex: 1, fontSize: 10, textAlign: "right" },
  cellUnit: { flex: 1.6, fontSize: 10, textAlign: "right" },
  cellTax: { flex: 1, fontSize: 10, textAlign: "right" },
  cellAmount: {
    flex: 1.8,
    fontSize: 10,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },

  totals: {
    marginTop: 12,
    marginLeft: "auto",
    width: "48%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
  },
  totalsLabel: { fontSize: 10, color: "#475569" },
  totalsValue: { fontSize: 10, color: "#0f172a", fontFamily: "Helvetica-Bold" },
  grandLabel: { fontSize: 12, color: "#0f172a", fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 13, color: "#0f172a", fontFamily: "Helvetica-Bold" },

  block: { marginTop: 20 },
  blockHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  blockBody: { fontSize: 9.5, color: "#334155" },

  bankGrid: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  bankItem: { width: "48%", marginBottom: 4 },
  bankLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase" },
  bankValue: { fontSize: 9.5, color: "#0f172a" },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8.5,
    color: "#94a3b8",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
});

function fmt(amount: number, currency: string): string {
  // Use the ISO code as a prefix — the PDF's Helvetica font can't render
  // every currency symbol (e.g. ₹), so a code keeps totals unambiguous.
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function joinAddress(parts: Array<string | undefined>): string {
  return parts.filter((p) => p && p.trim().length > 0).join(", ");
}

export function QuotationPdfDocument({
  company,
  quotation,
}: {
  company: QuotationPdfCompany;
  quotation: QuotationPdfData;
}) {
  const sellerName = company.displayName || company.legalName;
  const cityLine = joinAddress([
    company.address.city,
    company.address.state,
    company.address.postalCode,
  ]);
  const hasBank = Boolean(
    company.bank.bankName ||
      company.bank.accountNumber ||
      company.bank.ifsc ||
      company.bank.upiId,
  );

  return (
    <Document
      title={`Quotation ${quotation.number}`}
      author={company.legalName}
      subject={`Quotation for ${quotation.recipient.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header: seller (left) / quotation meta (right) */}
        <View style={styles.topRow}>
          <View style={{ maxWidth: "52%" }}>
            <View style={styles.headerBar} />
            <Text style={styles.fromName}>{sellerName}</Text>
            {company.legalName !== sellerName ? (
              <Text style={styles.fromLine}>{company.legalName}</Text>
            ) : null}
            {company.address.line1 ? (
              <Text style={styles.fromLine}>{company.address.line1}</Text>
            ) : null}
            {company.address.line2 ? (
              <Text style={styles.fromLine}>{company.address.line2}</Text>
            ) : null}
            {cityLine ? <Text style={styles.fromLine}>{cityLine}</Text> : null}
            {company.address.country ? (
              <Text style={styles.fromLine}>{company.address.country}</Text>
            ) : null}
            {company.email ? (
              <Text style={styles.fromLine}>{company.email}</Text>
            ) : null}
            {company.phone ? (
              <Text style={styles.fromLine}>{company.phone}</Text>
            ) : null}
            {company.website ? (
              <Text style={styles.fromLine}>{company.website}</Text>
            ) : null}
            {company.gstin ? (
              <Text style={styles.fromLine}>GSTIN: {company.gstin}</Text>
            ) : null}
            {company.pan ? (
              <Text style={styles.fromLine}>PAN: {company.pan}</Text>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={[styles.numberValue, { marginTop: 6 }]}>
              {quotation.number}
            </Text>
            <Text style={styles.statusPill}>
              {QUOTATION_STATUS_LABEL[quotation.status]}
            </Text>
            <Text style={styles.metaRight}>
              Issued: {fmtDate(quotation.issueDate)}
            </Text>
            <Text style={styles.metaRight}>
              Valid until: {fmtDate(quotation.validUntil)}
            </Text>
          </View>
        </View>

        {/* Bill to */}
        <View style={styles.billRow}>
          <View style={styles.billBlock}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.value}>{quotation.recipient.name}</Text>
            {quotation.recipient.company ? (
              <Text style={styles.valueMuted}>
                {quotation.recipient.company}
              </Text>
            ) : null}
            {quotation.recipient.email ? (
              <Text style={styles.valueMuted}>
                {quotation.recipient.email}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cellDesc, styles.cellHeader]}>
              Description
            </Text>
            <Text style={[styles.cellQty, styles.cellHeader]}>Qty</Text>
            <Text style={[styles.cellUnit, styles.cellHeader]}>Unit price</Text>
            <Text style={[styles.cellTax, styles.cellHeader]}>Tax</Text>
            <Text style={[styles.cellAmount, styles.cellHeader]}>Amount</Text>
          </View>
          {quotation.items.map((item, idx) => {
            const amount = lineSubtotal(item) + lineTax(item);
            return (
              <View key={`item-${idx}`} style={styles.row} wrap={false}>
                <Text style={styles.cellDesc}>{item.description}</Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellUnit}>
                  {fmt(item.unitPrice, quotation.currency)}
                </Text>
                <Text style={styles.cellTax}>{item.taxRate}%</Text>
                <Text style={styles.cellAmount}>
                  {fmt(amount, quotation.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>
              {fmt(quotation.subtotal, quotation.currency)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>
              {fmt(quotation.taxTotal, quotation.currency)}
            </Text>
          </View>
          {quotation.discount > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>
                -{fmt(quotation.discount, quotation.currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalsGrand}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>
              {fmt(quotation.total, quotation.currency)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes ? (
          <View style={styles.block}>
            <Text style={styles.blockHeading}>Notes</Text>
            <Text style={styles.blockBody}>{quotation.notes}</Text>
          </View>
        ) : null}

        {/* Terms */}
        {quotation.terms ? (
          <View style={styles.block}>
            <Text style={styles.blockHeading}>Terms &amp; conditions</Text>
            <Text style={styles.blockBody}>{quotation.terms}</Text>
          </View>
        ) : null}

        {/* Bank details */}
        {hasBank ? (
          <View style={styles.block}>
            <Text style={styles.blockHeading}>Payment details</Text>
            <View style={styles.bankGrid}>
              {company.bank.bankName ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{company.bank.bankName}</Text>
                </View>
              ) : null}
              {company.bank.accountName ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Account name</Text>
                  <Text style={styles.bankValue}>
                    {company.bank.accountName}
                  </Text>
                </View>
              ) : null}
              {company.bank.accountNumber ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Account number</Text>
                  <Text style={styles.bankValue}>
                    {company.bank.accountNumber}
                  </Text>
                </View>
              ) : null}
              {company.bank.ifsc ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>IFSC / SWIFT</Text>
                  <Text style={styles.bankValue}>{company.bank.ifsc}</Text>
                </View>
              ) : null}
              {company.bank.branch ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>Branch</Text>
                  <Text style={styles.bankValue}>{company.bank.branch}</Text>
                </View>
              ) : null}
              {company.bank.upiId ? (
                <View style={styles.bankItem}>
                  <Text style={styles.bankLabel}>UPI</Text>
                  <Text style={styles.bankValue}>{company.bank.upiId}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{company.legalName}</Text>
          <Text>{quotation.number}</Text>
        </View>
      </Page>
    </Document>
  );
}
