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
const PAGE_W = 595.28;
const HERO_H = 150;
const PAD_X = 48;

// Each entry: [background, text] for the status pill on the hero.
const STATUS_PILL: Record<QuotationStatus, { bg: string; fg: string }> = {
  draft: { bg: "#ffffff", fg: BRAND_DEEP },
  sent: { bg: "#e0f2fe", fg: "#0369a1" },
  accepted: { bg: "#d1fae5", fg: "#047857" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  expired: { bg: "#fef3c7", fg: "#b45309" },
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

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    position: "relative",
    height: HERO_H,
    marginBottom: 24,
  },
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
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
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
    fontSize: 24,
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
  heroMeta: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  heroMetaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: "#e9d5ff",
  },
  heroMetaValue: {
    fontSize: 10.5,
    color: "#ffffff",
    marginTop: 1,
  },

  // ── From / Bill to cards ─────────────────────────────────────
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

  // ── Items ────────────────────────────────────────────────────
  body: { paddingHorizontal: PAD_X },
  table: { marginTop: 4 },
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
    paddingVertical: 8,
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
  cellDesc: { flex: 4, fontSize: 10, color: INK_SOFT },
  cellQty: { flex: 1, fontSize: 10, textAlign: "right", color: INK_SOFT },
  cellUnit: { flex: 1.6, fontSize: 10, textAlign: "right", color: INK_SOFT },
  cellTax: { flex: 1, fontSize: 10, textAlign: "right", color: INK_SOFT },
  cellAmount: {
    flex: 1.8,
    fontSize: 10,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: INK,
  },

  // ── Totals ───────────────────────────────────────────────────
  totalsWrap: {
    marginTop: 16,
    marginLeft: "auto",
    width: "52%",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  totalsLabel: { fontSize: 10, color: MUTED },
  totalsValue: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },
  totalsGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: TINT,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  grandLabel: {
    fontSize: 11,
    color: BRAND_DEEP,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  grandValue: {
    fontSize: 14,
    color: BRAND_DEEP,
    fontFamily: "Helvetica-Bold",
  },

  // ── Blocks (notes / terms / bank) ────────────────────────────
  block: {
    marginTop: 18,
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

  bankGrid: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bankItem: {
    width: "48%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: LINE_SOFT,
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
  bankValue: {
    fontSize: 10,
    color: INK,
    marginTop: 1,
    fontFamily: "Helvetica-Bold",
  },

  // ── Footer ───────────────────────────────────────────────────
  // Footer is placed statically at the end of the page and pushed to the
  // bottom by `styles.spacer` (flexGrow: 1). React-pdf v4 has known issues
  // with `position: "absolute" + fixed`, so we avoid that pattern entirely.
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
  footerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  footerNumber: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  footerCenter: {
    flex: 1,
    paddingHorizontal: 16,
  },
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

function HeroBackground() {
  return (
    <Svg width={PAGE_W} height={HERO_H} style={styles.heroSvg}>
      <Defs>
        <LinearGradient id="quoteHero" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BRAND_DEEP} />
          <Stop offset="1" stopColor={BRAND_PRIMARY} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={PAGE_W} height={HERO_H} fill="url(#quoteHero)" />
      {/* soft decorative circles */}
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

function Footer({
  brand,
  number,
  sellerName,
  contact,
}: {
  brand: string;
  number: string;
  sellerName: string;
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
          Thank you for considering {sellerName}.
        </Text>
        {contactParts.length > 0 ? (
          <Text style={styles.footerContact}>
            {contactParts.join("  ·  ")}
          </Text>
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
  const pill = STATUS_PILL[quotation.status];

  return (
    <Document
      title={`Quotation ${quotation.number}`}
      author={company.legalName}
      subject={`Quotation for ${quotation.recipient.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ─── Hero ─── */}
        <View style={styles.hero}>
          <HeroBackground />
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <View style={styles.brandMark}>
                <View style={styles.brandDot} />
                <Text style={styles.brandText}>{sellerName.toUpperCase()}</Text>
              </View>
              <Text style={styles.eyebrow}>QUOTATION</Text>
              <Text style={styles.heroNumber}>{quotation.number}</Text>
            </View>
            <View style={styles.heroRight}>
              <Text
                style={[
                  styles.statusPill,
                  { backgroundColor: pill.bg, color: pill.fg },
                ]}
              >
                {QUOTATION_STATUS_LABEL[quotation.status]}
              </Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>ISSUED</Text>
                <Text style={styles.heroMetaValue}>
                  {fmtDate(quotation.issueDate)}
                </Text>
              </View>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaLabel}>VALID UNTIL</Text>
                <Text style={styles.heroMetaValue}>
                  {fmtDate(quotation.validUntil)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── From / Bill to cards ─── */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardLabel}>FROM</Text>
            <Text style={styles.cardName}>{sellerName}</Text>
            {company.legalName !== sellerName ? (
              <Text style={styles.cardLine}>{company.legalName}</Text>
            ) : null}
            {company.address.line1 ? (
              <Text style={styles.cardSubtle}>{company.address.line1}</Text>
            ) : null}
            {company.address.line2 ? (
              <Text style={styles.cardSubtle}>{company.address.line2}</Text>
            ) : null}
            {cityLine ? (
              <Text style={styles.cardSubtle}>{cityLine}</Text>
            ) : null}
            {company.address.country ? (
              <Text style={styles.cardSubtle}>{company.address.country}</Text>
            ) : null}
            {company.email ? (
              <Text style={styles.cardSubtle}>{company.email}</Text>
            ) : null}
            {company.phone ? (
              <Text style={styles.cardSubtle}>{company.phone}</Text>
            ) : null}
            {company.website ? (
              <Text style={styles.cardSubtle}>{company.website}</Text>
            ) : null}
            {company.gstin ? (
              <Text style={styles.cardSubtle}>GSTIN: {company.gstin}</Text>
            ) : null}
            {company.pan ? (
              <Text style={styles.cardSubtle}>PAN: {company.pan}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardLabel}>BILL TO</Text>
            <Text style={styles.cardName}>{quotation.recipient.name}</Text>
            {quotation.recipient.company ? (
              <Text style={styles.cardLine}>{quotation.recipient.company}</Text>
            ) : null}
            {quotation.recipient.email ? (
              <Text style={styles.cardSubtle}>{quotation.recipient.email}</Text>
            ) : null}
            <View style={{ marginTop: 8 }}>
              <Text style={styles.cardLabel}>CURRENCY</Text>
              <Text style={styles.cardLine}>{quotation.currency}</Text>
            </View>
          </View>
        </View>

        {/* ─── Body ─── */}
        <View style={styles.body}>
          {/* Items */}
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.cellDesc, styles.cellHeader]}>
                DESCRIPTION
              </Text>
              <Text style={[styles.cellQty, styles.cellHeader]}>QTY</Text>
              <Text style={[styles.cellUnit, styles.cellHeader]}>
                UNIT PRICE
              </Text>
              <Text style={[styles.cellTax, styles.cellHeader]}>TAX</Text>
              <Text style={[styles.cellAmount, styles.cellHeader]}>AMOUNT</Text>
            </View>
            {quotation.items.map((item, idx) => {
              const amount = lineSubtotal(item) + lineTax(item);
              return (
                <View
                  key={`item-${idx}`}
                  style={[styles.row, idx % 2 === 1 ? styles.rowAlt : {}]}
                  wrap={false}
                >
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
          <View style={styles.totalsWrap} wrap={false}>
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
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandValue}>
                {fmt(quotation.total, quotation.currency)}
              </Text>
            </View>
          </View>

          {/* Notes — allow the body text to split across pages, but require
              enough room on the current page for the heading + a few lines so
              the heading doesn't orphan at the page bottom. */}
          {quotation.notes ? (
            <View style={styles.block} minPresenceAhead={60}>
              <Text style={styles.blockHeading}>Notes</Text>
              <Text style={styles.blockBody}>{quotation.notes}</Text>
            </View>
          ) : null}

          {/* Terms — same pagination policy as Notes. */}
          {quotation.terms ? (
            <View style={styles.block} minPresenceAhead={60}>
              <Text style={styles.blockHeading}>Terms &amp; conditions</Text>
              <Text style={styles.blockBody}>{quotation.terms}</Text>
            </View>
          ) : null}

          {/* Bank details */}
          {hasBank ? (
            <View style={styles.block} wrap={false}>
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
        </View>

        <View style={styles.spacer} />
        <Footer
          brand={company.legalName || sellerName}
          sellerName={sellerName}
          number={quotation.number}
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
