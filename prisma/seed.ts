import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;
const DEMO_EMAIL = "demo@getpaid.dev";
const DEMO_PASSWORD = "demo1234";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cents(dollars: number): number {
  return Math.round(dollars * 100);
}

const CLIENT_DATA = [
  { name: "Acme Corporation", email: "billing@acme.corp", defaultRate: cents(175) },
  { name: "Globex Industries", email: "accounts@globex.io", defaultRate: cents(120) },
  { name: "Initech Solutions", email: "finance@initech.com", defaultRate: null },
  { name: "Umbrella Labs", email: "payments@umbrella-labs.org", defaultRate: null },
  { name: "Stark Enterprises", email: "ap@stark-ent.com", defaultRate: cents(200) },
  { name: "Wayne Technologies", email: "invoices@waynetech.co", defaultRate: null },
  { name: "Pied Piper Inc", email: "billing@piedpiper.io", defaultRate: null },
  { name: "Hooli Systems", email: "finance@hooli.systems", defaultRate: cents(160) },
  { name: "Cyberdyne Analytics", email: "payments@cyberdyne.ai", defaultRate: null },
  { name: "Aperture Creative", email: "accounts@aperture.design", defaultRate: null },
];

const LINE_ITEM_CATALOG = [
  { title: "Web Development", unitPrice: cents(150) },
  { title: "UI/UX Design", unitPrice: cents(120) },
  { title: "API Integration", unitPrice: cents(175) },
  { title: "Database Architecture", unitPrice: cents(200) },
  { title: "DevOps Consulting", unitPrice: cents(180) },
  { title: "Code Review & Audit", unitPrice: cents(130) },
  { title: "Technical Writing", unitPrice: cents(90) },
  { title: "Project Management", unitPrice: cents(110) },
  { title: "QA Testing", unitPrice: cents(95) },
  { title: "Cloud Infrastructure Setup", unitPrice: cents(160) },
  { title: "Mobile App Development", unitPrice: cents(170) },
  { title: "SEO Optimization", unitPrice: cents(100) },
  { title: "Performance Tuning", unitPrice: cents(185) },
  { title: "Security Assessment", unitPrice: cents(210) },
  { title: "Data Migration", unitPrice: cents(140) },
];

const TEMPLATE_DATA = [
  {
    name: "Standard Consulting",
    description: "Hourly consulting work",
    dueDays: 30,
    taxRate: 0,
    items: [
      { title: "Consulting Hours", quantity: 10, unitPrice: cents(150) },
      { title: "Project Management", quantity: 5, unitPrice: cents(110) },
    ],
  },
  {
    name: "Web Project",
    description: "Full-stack web development project",
    dueDays: 14,
    taxRate: 20,
    items: [
      { title: "Web Development", description: "Full-stack React + Node.js", quantity: 40, unitPrice: cents(150) },
      { title: "UI/UX Design", description: "Figma mockups and prototyping", quantity: 20, unitPrice: cents(120) },
      { title: "QA Testing", quantity: 10, unitPrice: cents(95) },
    ],
  },
  {
    name: "Monthly Retainer",
    description: "Ongoing monthly support",
    dueDays: 15,
    taxRate: 0,
    items: [
      { title: "Monthly Retainer Fee", quantity: 1, unitPrice: cents(5000) },
      { title: "Support Hours (included)", quantity: 20, unitPrice: cents(0) },
    ],
  },
  {
    name: "Security Audit",
    description: "Comprehensive security review",
    dueDays: 30,
    taxRate: 10,
    items: [
      { title: "Security Assessment", description: "OWASP Top 10 review", quantity: 8, unitPrice: cents(210) },
      { title: "Code Review & Audit", quantity: 16, unitPrice: cents(130) },
      { title: "Technical Writing", description: "Security report and recommendations", quantity: 4, unitPrice: cents(90) },
      { title: "DevOps Consulting", quantity: 4, unitPrice: cents(180) },
    ],
  },
];

interface InvoiceSpec {
  clientIndex: number;
  status: "DRAFT" | "SENT" | "VIEWED" | "OVERDUE" | "PARTIALLY_PAID" | "PAID";
  createdDaysAgo: number;
  dueDaysFromCreation: number;
  taxRate: number;
  itemCount: number;
}

const INVOICE_SPECS: InvoiceSpec[] = [
  { clientIndex: 0, status: "PAID", createdDaysAgo: 150, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 0, status: "PAID", createdDaysAgo: 120, dueDaysFromCreation: 30, taxRate: 10, itemCount: 2 },
  { clientIndex: 0, status: "SENT", createdDaysAgo: 5, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 1, status: "PAID", createdDaysAgo: 140, dueDaysFromCreation: 14, taxRate: 20, itemCount: 4 },
  { clientIndex: 1, status: "OVERDUE", createdDaysAgo: 60, dueDaysFromCreation: 30, taxRate: 20, itemCount: 3 },
  { clientIndex: 1, status: "VIEWED", createdDaysAgo: 10, dueDaysFromCreation: 30, taxRate: 20, itemCount: 2 },
  { clientIndex: 2, status: "PAID", createdDaysAgo: 130, dueDaysFromCreation: 30, taxRate: 0, itemCount: 2 },
  { clientIndex: 2, status: "PARTIALLY_PAID", createdDaysAgo: 45, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 2, status: "DRAFT", createdDaysAgo: 2, dueDaysFromCreation: 30, taxRate: 0, itemCount: 2 },
  { clientIndex: 3, status: "PAID", createdDaysAgo: 100, dueDaysFromCreation: 14, taxRate: 10, itemCount: 3 },
  { clientIndex: 3, status: "SENT", createdDaysAgo: 8, dueDaysFromCreation: 30, taxRate: 10, itemCount: 2 },
  { clientIndex: 3, status: "DRAFT", createdDaysAgo: 1, dueDaysFromCreation: 30, taxRate: 10, itemCount: 4 },
  { clientIndex: 4, status: "PAID", createdDaysAgo: 110, dueDaysFromCreation: 30, taxRate: 0, itemCount: 2 },
  { clientIndex: 4, status: "PAID", createdDaysAgo: 80, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 4, status: "OVERDUE", createdDaysAgo: 50, dueDaysFromCreation: 14, taxRate: 0, itemCount: 2 },
  { clientIndex: 5, status: "PAID", createdDaysAgo: 160, dueDaysFromCreation: 30, taxRate: 15, itemCount: 3 },
  { clientIndex: 5, status: "VIEWED", createdDaysAgo: 12, dueDaysFromCreation: 30, taxRate: 15, itemCount: 2 },
  { clientIndex: 5, status: "DRAFT", createdDaysAgo: 0, dueDaysFromCreation: 30, taxRate: 15, itemCount: 3 },
  { clientIndex: 6, status: "PAID", createdDaysAgo: 90, dueDaysFromCreation: 30, taxRate: 0, itemCount: 2 },
  { clientIndex: 6, status: "PARTIALLY_PAID", createdDaysAgo: 40, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 6, status: "SENT", createdDaysAgo: 3, dueDaysFromCreation: 14, taxRate: 0, itemCount: 2 },
  { clientIndex: 7, status: "PAID", createdDaysAgo: 170, dueDaysFromCreation: 30, taxRate: 20, itemCount: 4 },
  { clientIndex: 7, status: "OVERDUE", createdDaysAgo: 55, dueDaysFromCreation: 14, taxRate: 20, itemCount: 2 },
  { clientIndex: 7, status: "DRAFT", createdDaysAgo: 1, dueDaysFromCreation: 30, taxRate: 20, itemCount: 3 },
  { clientIndex: 8, status: "PAID", createdDaysAgo: 75, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 8, status: "SENT", createdDaysAgo: 7, dueDaysFromCreation: 30, taxRate: 0, itemCount: 2 },
  { clientIndex: 8, status: "VIEWED", createdDaysAgo: 15, dueDaysFromCreation: 30, taxRate: 0, itemCount: 3 },
  { clientIndex: 9, status: "PAID", createdDaysAgo: 85, dueDaysFromCreation: 14, taxRate: 10, itemCount: 2 },
  { clientIndex: 9, status: "PARTIALLY_PAID", createdDaysAgo: 35, dueDaysFromCreation: 30, taxRate: 10, itemCount: 3 },
  { clientIndex: 9, status: "OVERDUE", createdDaysAgo: 65, dueDaysFromCreation: 30, taxRate: 10, itemCount: 2 },
];

function pickItems(count: number, startOffset: number) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const catalogItem = LINE_ITEM_CATALOG[(startOffset + i) % LINE_ITEM_CATALOG.length];
    const quantity = randomInt(1, 20);
    items.push({
      title: catalogItem.title,
      quantity,
      unitPrice: catalogItem.unitPrice,
      amount: quantity * catalogItem.unitPrice,
    });
  }
  return items;
}

async function main() {
  console.log("Seeding database...");

  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    console.log("Deleting existing demo user data...");
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash,
      },
    });
    console.log(`Created user: ${user.email}`);

    const senderProfile = await tx.senderProfile.create({
      data: {
        userId: user.id,
        companyName: "GetPaid Demo Studio",
        displayName: "GetPaid Demo",
        emailFrom: "invoices@getpaid.dev",
        address: "123 Innovation Blvd\nSan Francisco, CA 94105\nUnited States",
        taxId: "US-12-3456789",
        defaultCurrency: "USD",
        primaryColor: "#1976d2",
        accentColor: "#9c27b0",
        footerText: "Thank you for your business!\nPayment is due within the specified period.",
        fontFamily: "system",
        invoicePrefix: "DEMO",
        defaultRate: cents(150),
      },
    });
    console.log(`Created sender profile: ${senderProfile.companyName}`);

    const clients = await Promise.all(
      CLIENT_DATA.map((c) =>
        tx.client.create({
          data: { userId: user.id, name: c.name, email: c.email, defaultRate: c.defaultRate },
        })
      )
    );
    console.log(`Created ${clients.length} clients`);

    const templates = await Promise.all(
      TEMPLATE_DATA.map((t) =>
        tx.invoiceTemplate.create({
          data: {
            userId: user.id,
            name: t.name,
            description: t.description,
            dueDays: t.dueDays,
            taxRate: t.taxRate,
            items: { create: t.items },
          },
        })
      )
    );
    console.log(`Created ${templates.length} templates`);

    let invoiceCount = 0;
    let itemCount = 0;
    let eventCount = 0;
    let paymentCount = 0;

    for (const spec of INVOICE_SPECS) {
      const client = clients[spec.clientIndex];
      const createdAt = daysAgo(spec.createdDaysAgo);
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + spec.dueDaysFromCreation);

      const items = pickItems(spec.itemCount, invoiceCount * 3);
      const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
      const taxAmount = Math.round(subtotal * (spec.taxRate / 100));
      const total = subtotal + taxAmount;

      let paidAmount = 0;
      let sentAt: Date | null = null;
      let viewedAt: Date | null = null;
      let paidAt: Date | null = null;
      let paymentMethod: "MANUAL" | "BANK_TRANSFER" | "CASH" | "OTHER" | null = null;

      if (spec.status !== "DRAFT") {
        sentAt = new Date(createdAt);
        sentAt.setDate(sentAt.getDate() + 1);
      }
      if (spec.status === "VIEWED" || spec.status === "PAID" || spec.status === "PARTIALLY_PAID") {
        viewedAt = new Date(sentAt!);
        viewedAt.setDate(viewedAt.getDate() + randomInt(1, 3));
      }
      if (spec.status === "PAID") {
        paidAmount = total;
        paidAt = new Date(viewedAt ?? sentAt!);
        paidAt.setDate(paidAt.getDate() + randomInt(3, 14));
        paymentMethod = "BANK_TRANSFER";
      }
      if (spec.status === "PARTIALLY_PAID") {
        paidAmount = Math.round(total * 0.4);
        paymentMethod = "MANUAL";
      }

      const invoice = await tx.invoice.create({
        data: {
          userId: user.id,
          clientId: client.id,
          publicId: nanoid(10),
          currency: "USD",
          status: spec.status,
          subtotal,
          taxRate: spec.taxRate,
          taxAmount,
          total,
          paidAmount,
          dueDate,
          sentAt,
          viewedAt,
          paidAt,
          paymentMethod,
          notes: spec.status === "DRAFT" ? "Draft — review before sending." : null,
          tags: spec.taxRate > 0 ? ["taxable"] : [],
          paymentReference: spec.status !== "DRAFT" ? `INV${nanoid(6).toUpperCase()}` : null,
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
        },
      });

      invoiceCount++;
      itemCount += items.length;

      const events: Array<{
        invoiceId: string;
        type: "CREATED" | "SENT" | "VIEWED" | "PAID_MANUAL" | "PAYMENT_RECORDED" | "STATUS_CHANGED" | "REMINDER_SENT";
        payload?: object;
        createdAt: Date;
      }> = [{ invoiceId: invoice.id, type: "CREATED", createdAt }];

      if (sentAt) {
        events.push({ invoiceId: invoice.id, type: "SENT", createdAt: sentAt });
      }
      if (viewedAt) {
        events.push({ invoiceId: invoice.id, type: "VIEWED", createdAt: viewedAt });
      }
      if (spec.status === "PAID" && paidAt) {
        events.push({
          invoiceId: invoice.id,
          type: "PAID_MANUAL",
          payload: { amount: total, method: "BANK_TRANSFER" },
          createdAt: paidAt,
        });
      }
      if (spec.status === "PARTIALLY_PAID") {
        const payDate = new Date(viewedAt ?? sentAt!);
        payDate.setDate(payDate.getDate() + randomInt(5, 10));
        events.push({
          invoiceId: invoice.id,
          type: "PAYMENT_RECORDED",
          payload: { amount: paidAmount, method: "MANUAL" },
          createdAt: payDate,
        });

        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: paidAmount,
            method: "MANUAL",
            note: "Partial payment received",
            paidAt: payDate,
            createdAt: payDate,
          },
        });
        paymentCount++;
      }
      if (spec.status === "PAID" && paidAt) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: total,
            method: "BANK_TRANSFER",
            note: "Full payment received",
            paidAt,
            createdAt: paidAt,
          },
        });
        paymentCount++;
      }
      if (spec.status === "OVERDUE") {
        events.push({
          invoiceId: invoice.id,
          type: "STATUS_CHANGED",
          payload: { from: "SENT", to: "OVERDUE" },
          createdAt: dueDate,
        });
      }

      await tx.invoiceEvent.createMany({ data: events });
      eventCount += events.length;
    }

    console.log(`Created ${invoiceCount} invoices with ${itemCount} items`);
    console.log(`Created ${eventCount} events`);
    console.log(`Created ${paymentCount} payments`);
  }, { timeout: 60000 });

  console.log("\nSeed completed successfully!");
  console.log(`Login with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
