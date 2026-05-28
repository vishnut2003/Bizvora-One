/**
 * Seeds the two initial pricing plans (₹300/mo, ₹2,400/yr) into Razorpay + Mongo.
 *
 * Run once after deploy:
 *   npx tsx --env-file=.env scripts/seed-plans.ts
 *
 * Idempotent: skips any plan that already exists in Mongo with the same
 * (amount, period, interval) tuple.
 */
import mongoose from "mongoose";
import Razorpay from "razorpay";
import Plan from "@/models/plan";
import type { BillingPeriod } from "@/lib/billing";

type SeedPlan = {
  name: string;
  description: string;
  amount: number; // paise per seat per period
  period: BillingPeriod;
  interval: number;
  badge: string;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
};

const PLANS: SeedPlan[] = [
  {
    name: "Annual",
    description: "Complete access to every feature — at our best price.",
    amount: 240000, // ₹2,400 per seat per year
    period: "yearly",
    interval: 1,
    badge: "Save 33%",
    featured: true,
    visible: true,
    sortOrder: 1,
  },
  {
    name: "Monthly",
    description: "Complete access to every feature, with no commitment.",
    amount: 30000, // ₹300 per seat per month
    period: "monthly",
    interval: 1,
    badge: "",
    featured: false,
    visible: true,
    sortOrder: 2,
  },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment variables`);
  return value;
}

async function main() {
  const MONGODB_URI = requireEnv("MONGODB_URI");
  const DB_NAME = requireEnv("DB_NAME");

  const razorpay = new Razorpay({
    key_id: requireEnv("RAZORPAY_KEY_ID"),
    key_secret: requireEnv("RAZORPAY_KEY_SECRET"),
  });

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  console.log(`Connected to Mongo (db: ${DB_NAME}).`);

  for (const seed of PLANS) {
    const existing = await Plan.findOne({
      amount: seed.amount,
      period: seed.period,
      interval: seed.interval,
    }).lean();

    if (existing) {
      console.log(
        `✓ Plan "${seed.name}" already exists (razorpayPlanId=${existing.razorpayPlanId}), skipping.`,
      );
      continue;
    }

    console.log(`→ Creating "${seed.name}" in Razorpay…`);
    const created = await razorpay.plans.create({
      period: seed.period,
      interval: seed.interval,
      item: {
        name: seed.name,
        amount: seed.amount,
        currency: "INR",
      },
      notes: { source: "wss-crm seed" },
    });
    console.log(`  Razorpay plan_id: ${created.id}`);

    await Plan.create({
      razorpayPlanId: created.id,
      amount: seed.amount,
      currency: "INR",
      period: seed.period,
      interval: seed.interval,
      name: seed.name,
      description: seed.description,
      badge: seed.badge,
      featured: seed.featured,
      visible: seed.visible,
      archived: false,
      sortOrder: seed.sortOrder,
      trialDays: 0,
    });
    console.log(`  Plan row inserted into Mongo.`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
