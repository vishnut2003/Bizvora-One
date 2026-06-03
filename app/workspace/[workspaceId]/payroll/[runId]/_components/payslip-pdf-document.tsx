"use client";

import {
  Defs,
  Document,
  LinearGradient,
  Page,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  PAYROLL_RUN_STATUS_LABEL,
  type PayrollRunStatus,
} from "@/lib/payroll";

export type PayslipPdfCompany = {
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
};

export type PayslipPdfLine = { label: string; amount: number };

export type PayslipPdfData = {
  number: string;
  periodLabel: string;
  status: PayrollRunStatus;
  currency: string;
  employee: {
    name: string;
    empId: string;
    designation: string;
    department: string;
  };
  earnings: PayslipPdfLine[];
  deductions: PayslipPdfLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  notes: string;
  paidOn: string | null;
};

const BRAND_PRIMARY = "#8C00FF";
const BRAND_DEEP = "#450693";
const INK = "#0f172a";
const INK_SOFT = "#1f2937";
const TEXT = "#334155";
const MUTED = "#64748b";
const MUTED_SOFT = "#94a3b8";
const LINE = "#e2e8f0";
const LINE_SOFT = "#f1f5f9";
const TINT = "#f5f0ff";
const EMERALD = "#047857";
const EMERALD_BG = "#d1fae5";
const PAGE_W = 595.28;
const HERO_H = 150;
const PAD_X = 48;

const STATUS_PILL: Record<PayrollRunStatus, { bg: string; fg: string }> = {
  draft: { bg: "#e2e8f0", fg: "#475569" },
  approved: { bg: "#dbeafe", fg: "#1d4ed8" },
  paid: { bg: EMERALD_BG, fg: EMERALD },
  cancelled: { bg: "#fee2e2", fg: "#b91c1c" },
};

const styles = StyleSheet.create({
  page: {
    paddingBottom: 32,
    fontSize: 10,
    lineHeight: 1.45,
    color: INK,
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  spacer: { flexGrow: 1 },

  hero: { position: "relative", height: HERO_H, marginBottom: 24 },
  heroSvg: { position: "absolute", top: 0, left: 0 },
  heroContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingHorizontal: PAD_X,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLeft: { maxWidth: "62%" },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ffffff" },
  brandText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.6,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: "#e9d5ff",
    marginBottom: 4,
  },
  heroNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  heroRight: { alignItems: "flex-end" },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  heroMeta: { marginTop: 10, alignItems: "flex-end" },
  heroMetaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: "#e9d5ff",
  },
  heroMetaValue: { fontSize: 10.5, color: "#ffffff", marginTop: 1 },

  cardsRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: PAD_X,
    marginBottom: 22,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 14,
    backgroundColor: "#ffffff",
  },
  cardAccent: {
    height: 3,
    width: 24,
    backgroundColor: BRAND_PRIMARY,
    marginBottom: 10,
    borderRadius: 1.5,
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    color: MUTED_SOFT,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 2,
  },
  cardLine: { fontSize: 9.5, color: INK_SOFT, marginTop: 1.5 },
  cardSubtle: { fontSize: 9, color: MUTED, marginTop: 1.5 },

  body: { paddingHorizontal: PAD_X },

  netCard: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 18,
  },
  netBand: { backgroundColor: BRAND_DEEP, paddingVertical: 6, paddingHorizontal: 14 },
  netBandLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.6,
  },
  netBody: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TINT,
  },
  netValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    letterSpacing: 0.3,
  },
  netHint: {
    flex: 1,
    paddingRight: 16,
    fontSize: 9.5,
    color: TEXT,
    fontFamily: "Helvetica-Oblique",
  },

  table: { marginTop: 4, marginBottom: 14 },
  tableHeading: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: BRAND_DEEP,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_SOFT,
  },
  rowAlt: { backgroundColor: "#fafafa" },
  cellHeader: {
    color: "#ffffff",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
  },
  cellLabel: { flex: 2, fontSize: 10, color: INK_SOFT },
  cellAmount: {
    flex: 1,
    fontSize: 10,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: INK,
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: TINT,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  totalLabel: {
    flex: 2,
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    letterSpacing: 0.6,
  },
  totalValue: {
    flex: 1,
    fontSize: 11,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
  },
  emptyLine: { paddingVertical: 7, paddingHorizontal: 10, fontSize: 9.5, color: MUTED },

  block: {
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_PRIMARY,
    paddingLeft: 12,
  },
  blockHeading: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  blockBody: { fontSize: 9.5, color: TEXT, lineHeight: 1.55 },

  footer: {
    marginTop: 16,
    marginHorizontal: PAD_X,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 12,
  },
  footerLeft: { flexDirection: "column" },
  footerBrandRow: { flexDirection: "row", alignItems: "center" },
  footerBrandDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRAND_PRIMARY,
    marginRight: 6,
  },
  footerBrandName: {
    fontSize: 9,
    color: INK,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  footerNumber: { fontSize: 8, color: MUTED, marginTop: 3, letterSpacing: 0.3 },
  footerCenter: { flex: 1, paddingHorizontal: 16 },
  footerThanks: {
    fontSize: 9,
    color: BRAND_DEEP,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
  },
  footerContact: {
    fontSize: 7.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  footerRight: { alignItems: "flex-end" },
  footerPageLabel: {
    fontSize: 7,
    color: MUTED_SOFT,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
  },
  footerPage: {
    fontSize: 9.5,
    color: INK,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    letterSpacing: 0.6,
  },
});

function fmt(amount: number, currency: string): string {
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

function HeroBackground() {
  return (
    <Svg width={PAGE_W} height={HERO_H} style={styles.heroSvg}>
      <Defs>
        <LinearGradient id="payslipHero" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BRAND_DEEP} />
          <Stop offset="1" stopColor={BRAND_PRIMARY} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={PAGE_W} height={HERO_H} fill="url(#payslipHero)" />
      <Rect
        x={PAGE_W - 160}
        y={-50}
        width={200}
        height={200}
        rx={100}
        ry={100}
        fill="#ffffff"
        fillOpacity={0.06}
      />
      <Rect
        x={PAGE_W - 70}
        y={80}
        width={140}
        height={140}
        rx={70}
        ry={70}
        fill="#ffffff"
        fillOpacity={0.05}
      />
    </Svg>
  );
}

function LineTable({
  heading,
  rows,
  totalLabel,
  total,
  currency,
}: {
  heading: string;
  rows: PayslipPdfLine[];
  totalLabel: string;
  total: number;
  currency: string;
}) {
  return (
    <View style={styles.table} wrap={false}>
      <Text style={styles.tableHeading}>{heading}</Text>
      <View style={styles.headerRow}>
        <Text style={[styles.cellLabel, styles.cellHeader]}>COMPONENT</Text>
        <Text style={[styles.cellAmount, styles.cellHeader]}>AMOUNT</Text>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.emptyLine}>No items.</Text>
      ) : (
        rows.map((r, idx) => (
          <View
            key={`${heading}-${idx}`}
            style={[styles.row, idx % 2 === 1 ? styles.rowAlt : {}]}
            wrap={false}
          >
            <Text style={styles.cellLabel}>{r.label}</Text>
            <Text style={styles.cellAmount}>{fmt(r.amount, currency)}</Text>
          </View>
        ))
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
        <Text style={styles.totalValue}>{fmt(total, currency)}</Text>
      </View>
    </View>
  );
}

export function PayslipPdfDocument({
  company,
  payslip,
}: {
  company: PayslipPdfCompany;
  payslip: PayslipPdfData;
}) {
  const employerName = company.displayName || company.legalName;
  const cityLine = joinAddress([
    company.address.city,
    company.address.state,
    company.address.postalCode,
  ]);
  const pill = STATUS_PILL[payslip.status];
  const empMeta = [payslip.employee.designation, payslip.employee.department]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`Payslip ${payslip.number} ${payslip.employee.empId}`}
      author={company.legalName}
      subject={`Payslip for ${payslip.employee.name} — ${payslip.periodLabel}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ─── Hero ─── */}
        <View style={styles.hero}>
          <HeroBackground />
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <View style={styles.brandMark}>
                <View style={styles.brandDot} />
                <Text style={styles.brandText}>{employerName.toUpperCase()}</Text>
              </View>
              <Text style={styles.eyebrow}>PAYSLIP</Text>
              <Text style={styles.heroNumber}>{payslip.periodLabel}</Text>
            </View>
            <View style={styles.heroRight}>
              <Text
                style={[
                  styles.statusPill,
                  { backgroundColor: pill.bg, color: pill.fg },
                ]}
              >
                {PAYROLL_RUN_STATUS_LABEL[payslip.status]}
              </Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>RUN</Text>
                <Text style={styles.heroMetaValue}>{payslip.number}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Employer / Employee cards ─── */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardLabel}>EMPLOYER</Text>
            <Text style={styles.cardName}>{employerName}</Text>
            {company.legalName !== employerName ? (
              <Text style={styles.cardLine}>{company.legalName}</Text>
            ) : null}
            {company.address.line1 ? (
              <Text style={styles.cardSubtle}>{company.address.line1}</Text>
            ) : null}
            {cityLine ? <Text style={styles.cardSubtle}>{cityLine}</Text> : null}
            {company.email ? (
              <Text style={styles.cardSubtle}>{company.email}</Text>
            ) : null}
            {company.phone ? (
              <Text style={styles.cardSubtle}>{company.phone}</Text>
            ) : null}
            {company.gstin ? (
              <Text style={styles.cardSubtle}>GSTIN: {company.gstin}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardLabel}>EMPLOYEE</Text>
            <Text style={styles.cardName}>{payslip.employee.name}</Text>
            <Text style={styles.cardLine}>ID: {payslip.employee.empId}</Text>
            {empMeta ? <Text style={styles.cardSubtle}>{empMeta}</Text> : null}
            <View style={{ marginTop: 8 }}>
              <Text style={styles.cardLabel}>PAY PERIOD</Text>
              <Text style={styles.cardLine}>{payslip.periodLabel}</Text>
            </View>
          </View>
        </View>

        {/* ─── Body ─── */}
        <View style={styles.body}>
          {/* Net pay hero */}
          <View style={styles.netCard} wrap={false}>
            <View style={styles.netBand}>
              <Text style={styles.netBandLabel}>NET PAY</Text>
            </View>
            <View style={styles.netBody}>
              <Text style={styles.netHint}>
                Gross {fmt(payslip.gross, payslip.currency)} less deductions{" "}
                {fmt(payslip.totalDeductions, payslip.currency)}.
                {payslip.paidOn ? ` Paid ${fmtDate(payslip.paidOn)}.` : ""}
              </Text>
              <Text style={styles.netValue}>
                {fmt(payslip.net, payslip.currency)}
              </Text>
            </View>
          </View>

          <LineTable
            heading="Earnings"
            rows={payslip.earnings}
            totalLabel="GROSS EARNINGS"
            total={payslip.gross}
            currency={payslip.currency}
          />
          <LineTable
            heading="Deductions"
            rows={payslip.deductions}
            totalLabel="TOTAL DEDUCTIONS"
            total={payslip.totalDeductions}
            currency={payslip.currency}
          />

          {payslip.notes ? (
            <View style={styles.block} minPresenceAhead={60}>
              <Text style={styles.blockHeading}>Notes</Text>
              <Text style={styles.blockBody}>{payslip.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.spacer} />
        <Footer
          brand={company.legalName || employerName}
          employeeName={payslip.employee.name}
          number={`${payslip.number} · ${payslip.employee.empId}`}
          contact={{
            email: company.email,
            phone: company.phone,
            website: company.website,
          }}
        />
      </Page>
    </Document>
  );
}

function Footer({
  brand,
  number,
  employeeName,
  contact,
}: {
  brand: string;
  number: string;
  employeeName: string;
  contact: { email: string; phone: string; website: string };
}) {
  const contactParts = [contact.email, contact.phone, contact.website].filter(
    (p) => p.trim().length > 0,
  );
  return (
    <View style={styles.footer}>
      <View style={styles.footerLeft}>
        <View style={styles.footerBrandRow}>
          <View style={styles.footerBrandDot} />
          <Text style={styles.footerBrandName}>{brand.toUpperCase()}</Text>
        </View>
        <Text style={styles.footerNumber}>{number}</Text>
      </View>

      <View style={styles.footerCenter}>
        <Text style={styles.footerThanks}>
          Payslip on file for {employeeName}. This is a system-generated
          document.
        </Text>
        {contactParts.length > 0 ? (
          <Text style={styles.footerContact}>{contactParts.join("  ·  ")}</Text>
        ) : null}
      </View>

      <View style={styles.footerRight}>
        <Text style={styles.footerPageLabel}>PAGE</Text>
        <Text
          style={styles.footerPage}
          render={({ pageNumber, totalPages }) =>
            `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`
          }
        />
      </View>
    </View>
  );
}
