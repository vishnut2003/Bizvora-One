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
import type { ProposalDocument } from "@/lib/proposal-ai";

const BRAND_PRIMARY = "#8C00FF";
const BRAND_DEEP = "#450693";
const INK = "#0f172a";
const INK_SOFT = "#1f2937";
const MUTED = "#64748b";
const MUTED_SOFT = "#94a3b8";
const LINE = "#e2e8f0";
const LINE_SOFT = "#f1f5f9";
const TINT = "#f5f0ff";
const PAGE_W = 595.28;

const styles = StyleSheet.create({
  // ── Cover page ────────────────────────────────────────────────
  cover: {
    fontFamily: "Helvetica",
    color: INK,
  },
  hero: {
    position: "relative",
    height: 340,
  },
  heroSvg: { position: "absolute", top: 0, left: 0 },
  heroContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 84,
    paddingHorizontal: 56,
    paddingBottom: 36,
    justifyContent: "space-between",
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  brandText: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: "#e9d5ff",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    lineHeight: 1.18,
    maxWidth: "85%",
  },
  heroDate: {
    fontSize: 10.5,
    color: "#ddd6fe",
    marginTop: 14,
  },

  coverBody: {
    paddingHorizontal: 56,
    paddingTop: 40,
    paddingBottom: 80,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 18,
    backgroundColor: "#ffffff",
  },
  cardAccent: {
    height: 3,
    width: 28,
    backgroundColor: BRAND_PRIMARY,
    marginBottom: 12,
    borderRadius: 1.5,
  },
  cardLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    color: MUTED_SOFT,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 3,
  },
  cardLine: {
    fontSize: 10,
    color: INK_SOFT,
    marginTop: 2,
  },
  cardSubtle: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 2,
  },

  summaryWrap: {
    marginTop: 32,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_PRIMARY,
    backgroundColor: TINT,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    color: BRAND_DEEP,
    marginBottom: 8,
  },
  summary: {
    fontSize: 11,
    color: INK_SOFT,
    lineHeight: 1.55,
  },

  // ── Body pages ────────────────────────────────────────────────
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 11,
    lineHeight: 1.5,
    color: INK,
    fontFamily: "Helvetica",
  },
  sectionBlock: { marginBottom: 18 },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: BRAND_PRIMARY,
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 5,
    marginRight: 10,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.2,
  },
  sectionBody: {
    fontSize: 10.5,
    color: INK_SOFT,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 4,
    paddingLeft: 32,
  },
  bulletDot: {
    width: 10,
    fontSize: 11,
    color: BRAND_PRIMARY,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: { flex: 1, fontSize: 10.5, color: INK_SOFT },

  // ── Pricing ───────────────────────────────────────────────────
  pricingTable: { marginTop: 4, marginBottom: 8 },
  pricingHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND_DEEP,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  pricingRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_SOFT,
  },
  pricingRowAlt: {
    backgroundColor: "#fafafa",
  },
  pricingTotalRow: {
    flexDirection: "row",
    backgroundColor: TINT,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cellDesc: { flex: 4, fontSize: 10.5, color: INK_SOFT },
  cellQty: { flex: 1, fontSize: 10.5, textAlign: "right", color: INK_SOFT },
  cellUnit: { flex: 1.5, fontSize: 10.5, textAlign: "right", color: INK_SOFT },
  cellTotal: {
    flex: 1.5,
    fontSize: 10.5,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: INK,
  },
  cellHeader: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
  },
  totalLabel: {
    flex: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    letterSpacing: 0.8,
  },
  totalValue: {
    flex: 3,
    fontSize: 13,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
  },
  pricingNotes: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 10,
    fontStyle: "italic",
  },

  // ── Timeline ──────────────────────────────────────────────────
  timelineRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingLeft: 32,
  },
  timelineBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND_PRIMARY,
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 4,
    marginRight: 10,
  },
  timelineBody: { flex: 1, paddingTop: 1 },
  timelineWhen: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    marginBottom: 1,
  },
  timelineMilestone: {
    fontSize: 10.5,
    color: INK_SOFT,
  },

  // ── Terms ─────────────────────────────────────────────────────
  termRow: {
    flexDirection: "row",
    marginTop: 6,
    paddingLeft: 32,
  },
  termIndex: {
    width: 18,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_PRIMARY,
  },
  termText: { flex: 1, fontSize: 10.5, color: INK_SOFT },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 8,
  },
  footerBrand: {
    fontSize: 8.5,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  footerTitle: { fontSize: 8.5, color: MUTED_SOFT },
  footerPage: { fontSize: 8.5, color: MUTED },
});

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.length === 3 ? currency.toUpperCase() : "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function HeroBackground() {
  return (
    <Svg width={PAGE_W} height={340} style={styles.heroSvg}>
      <Defs>
        <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BRAND_DEEP} />
          <Stop offset="1" stopColor={BRAND_PRIMARY} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={PAGE_W} height={340} fill="url(#heroGrad)" />
      {/* soft decorative circles */}
      <Rect
        x={PAGE_W - 180}
        y={-60}
        width={240}
        height={240}
        rx={120}
        ry={120}
        fill="#ffffff"
        fillOpacity={0.06}
      />
      <Rect
        x={PAGE_W - 80}
        y={180}
        width={180}
        height={180}
        rx={90}
        ry={90}
        fill="#ffffff"
        fillOpacity={0.05}
      />
    </Svg>
  );
}

function Footer({
  brand,
  title,
}: {
  brand: string;
  title: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerBrand}>{brand.toUpperCase()}</Text>
      <Text style={styles.footerTitle}>{title}</Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export function ProposalPdfDocument({ data }: { data: ProposalDocument }) {
  const totalAmount = data.pricing
    ? data.pricing.items.reduce(
        (sum, item) => sum + item.unitPrice * (item.quantity ?? 1),
        0,
      )
    : 0;

  const brand = data.preparedBy.company || "Proposal";

  return (
    <Document
      title={data.title}
      author={data.preparedBy.company}
      subject={`Proposal for ${data.client.name}`}
    >
      {/* ─────────── Cover page ─────────── */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.hero}>
          <HeroBackground />
          <View style={styles.heroContent}>
            <View style={styles.brandMark}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>{brand.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.eyebrow}>PROPOSAL</Text>
              <Text style={styles.heroTitle}>{data.title}</Text>
              <Text style={styles.heroDate}>{data.date}</Text>
            </View>
          </View>
        </View>

        <View style={styles.coverBody}>
          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardLabel}>PREPARED FOR</Text>
              <Text style={styles.cardName}>{data.client.name}</Text>
              {data.client.company ? (
                <Text style={styles.cardLine}>{data.client.company}</Text>
              ) : null}
              {data.client.address ? (
                <Text style={styles.cardSubtle}>{data.client.address}</Text>
              ) : null}
            </View>
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardLabel}>PREPARED BY</Text>
              <Text style={styles.cardName}>{data.preparedBy.name}</Text>
              <Text style={styles.cardLine}>{data.preparedBy.company}</Text>
              {data.preparedBy.email ? (
                <Text style={styles.cardSubtle}>{data.preparedBy.email}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.summaryWrap}>
            <Text style={styles.summaryLabel}>EXECUTIVE SUMMARY</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        </View>

        <Footer brand={brand} title={data.title} />
      </Page>

      {/* ─────────── Body page(s) ─────────── */}
      <Page size="A4" style={styles.page}>
        {data.sections.map((section, idx) => (
          <View
            key={`section-${idx}`}
            style={styles.sectionBlock}
            wrap={false}
          >
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionNumber}>{idx + 1}</Text>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            </View>
            {section.body ? (
              <Text style={styles.sectionBody}>{section.body}</Text>
            ) : null}
            {section.bullets?.map((b, i) => (
              <View key={`b-${idx}-${i}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        {data.pricing ? (
          <View style={styles.sectionBlock} wrap={false}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionNumber}>
                {data.sections.length + 1}
              </Text>
              <Text style={styles.sectionHeading}>Investment</Text>
            </View>
            <View style={styles.pricingTable}>
              <View style={styles.pricingHeaderRow}>
                <Text style={[styles.cellDesc, styles.cellHeader]}>ITEM</Text>
                <Text style={[styles.cellQty, styles.cellHeader]}>QTY</Text>
                <Text style={[styles.cellUnit, styles.cellHeader]}>UNIT</Text>
                <Text style={[styles.cellTotal, styles.cellHeader]}>TOTAL</Text>
              </View>
              {data.pricing.items.map((item, idx) => {
                const qty = item.quantity ?? 1;
                const lineTotal = item.unitPrice * qty;
                return (
                  <View
                    key={`item-${idx}`}
                    style={[
                      styles.pricingRow,
                      idx % 2 === 1 ? styles.pricingRowAlt : {},
                    ]}
                  >
                    <Text style={styles.cellDesc}>{item.description}</Text>
                    <Text style={styles.cellQty}>{qty}</Text>
                    <Text style={styles.cellUnit}>
                      {formatCurrency(item.unitPrice, data.pricing!.currency)}
                    </Text>
                    <Text style={styles.cellTotal}>
                      {formatCurrency(lineTotal, data.pricing!.currency)}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.pricingTotalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(totalAmount, data.pricing.currency)}
                </Text>
              </View>
              {data.pricing.notes ? (
                <Text style={styles.pricingNotes}>{data.pricing.notes}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {data.timeline && data.timeline.length ? (
          <View style={styles.sectionBlock} wrap={false}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionNumber}>
                {data.sections.length + (data.pricing ? 2 : 1)}
              </Text>
              <Text style={styles.sectionHeading}>Timeline</Text>
            </View>
            {data.timeline.map((t, idx) => (
              <View key={`t-${idx}`} style={styles.timelineRow}>
                <Text style={styles.timelineBullet}>{idx + 1}</Text>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineWhen}>{t.when}</Text>
                  <Text style={styles.timelineMilestone}>{t.milestone}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {data.terms && data.terms.length ? (
          <View style={styles.sectionBlock} wrap={false}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionNumber}>
                {data.sections.length +
                  (data.pricing ? 1 : 0) +
                  (data.timeline?.length ? 1 : 0) +
                  1}
              </Text>
              <Text style={styles.sectionHeading}>Terms</Text>
            </View>
            {data.terms.map((t, idx) => (
              <View key={`term-${idx}`} style={styles.termRow}>
                <Text style={styles.termIndex}>{idx + 1}.</Text>
                <Text style={styles.termText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Footer brand={brand} title={data.title} />
      </Page>
    </Document>
  );
}
