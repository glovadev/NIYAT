import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { SiteSettings } from "../src/models/SiteSettings";
import { Coupon } from "../src/models/Coupon";

async function runSeed() {
  console.log("=================================================");
  console.log("NIYAT Skincare — Database Seeding Script");
  console.log("=================================================");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log("✅ Connected to MongoDB Atlas cluster.");

  try {
    // 1. Seed Categories
    console.log("\n1. Seeding Categories...");
    const categoryDefs = [
      {
        name: "Face Cream",
        slug: "face-cream",
        description: "Hydrating and revitalizing creams crafted for radiant facial care.",
      },
      {
        name: "Facial Cleanser",
        slug: "facial-cleanser",
        description: "Gentle purifiers that cleanse impurities while preserving skin barrier moisture.",
      },
      {
        name: "Sun Protection",
        slug: "sun-protection",
        description: "Advanced daily defense shielding skin against harmful UV rays.",
      },
      {
        name: "Body Care",
        slug: "body-care",
        description: "Luxurious, deeply nourishing formulations for all-day skin hydration.",
      },
      {
        name: "Facial Serum",
        slug: "facial-serum",
        description: "Concentrated botanical and active serums for intensive skin rejuvenation.",
      },
    ];

    const categoryMap = new Map<string, mongoose.Types.ObjectId>();

    for (const cat of categoryDefs) {
      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
      categoryMap.set(cat.slug, doc._id as mongoose.Types.ObjectId);
      console.log(` - Category ready: ${doc.name} (${doc.slug})`);
    }

    // 2. Seed Initial 6 Products (Kept in DRAFT as mandated by PRD)
    console.log("\n2. Seeding 6 Initial Products (in DRAFT status)...");
    const productDefs = [
      {
        name: "Whitening Cream",
        slug: "whitening-cream",
        sku: "NIY-WC-040",
        sizeLabel: "40 g",
        categorySlug: "face-cream",
        shortDescription: "Signature skin radiance cream for a luminous, nourished complexion.",
        description:
          "Formulated to enhance skin vitality and tone. Rich in emollients that restore hydration and provide an even, illuminated skin texture.",
        regularPricePaise: 59900, // ₹599 placeholder until official pricing approved
        salePricePaise: null,
        stockQuantity: 50,
        lowStockThreshold: 10,
        status: "DRAFT" as const,
        isFeatured: true,
        tags: ["cream", "radiance", "face"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/whitening-cream",
            alt: "NIYAT Whitening Cream 40g",
            sortOrder: 0,
          },
        ],
      },
      {
        name: "Face Wash",
        slug: "face-wash",
        sku: "NIY-FW-100",
        sizeLabel: "100 g",
        categorySlug: "facial-cleanser",
        shortDescription: "Gentle purifying face wash for refreshing daily cleansing.",
        description:
          "Effectively removes impurities, excess sebum, and environmental residue without stripping essential moisture. Leaves skin refreshed, clear, and balanced.",
        regularPricePaise: 39900, // ₹399 placeholder
        salePricePaise: null,
        stockQuantity: 100,
        lowStockThreshold: 15,
        status: "DRAFT" as const,
        isFeatured: true,
        tags: ["cleanser", "face wash", "daily"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/face-wash",
            alt: "NIYAT Face Wash 100g",
            sortOrder: 0,
          },
        ],
      },
      {
        name: "Sunscreen",
        slug: "sunscreen",
        sku: "NIY-SS-050",
        sizeLabel: "50 g",
        categorySlug: "sun-protection",
        shortDescription: "Lightweight broad-spectrum daily sunscreen with non-greasy finish.",
        description:
          "Shields skin from daily UV exposure while providing smooth, non-sticky hydration suitable for daily wear under makeup or on bare skin.",
        regularPricePaise: 49900, // ₹499 placeholder
        salePricePaise: null,
        stockQuantity: 75,
        lowStockThreshold: 10,
        status: "DRAFT" as const,
        isFeatured: true,
        tags: ["sunscreen", "uv protection", "spf"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/sunscreen",
            alt: "NIYAT Sunscreen 50g",
            sortOrder: 0,
          },
        ],
      },
      {
        name: "Body Lotion",
        slug: "body-lotion",
        sku: "NIY-BL-200",
        sizeLabel: "200 g",
        categorySlug: "body-care",
        shortDescription: "Ultra-hydrating daily body lotion for velvet-smooth, supple skin.",
        description:
          "Formulated with rich skin conditioners to lock in deep moisture, soothe dry patches, and maintain skin suppleness throughout the day.",
        regularPricePaise: 64900, // ₹649 placeholder
        salePricePaise: null,
        stockQuantity: 60,
        lowStockThreshold: 10,
        status: "DRAFT" as const,
        isFeatured: false,
        tags: ["body", "lotion", "moisture"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/body-lotion",
            alt: "NIYAT Body Lotion 200g",
            sortOrder: 0,
          },
        ],
      },
      {
        name: "Emergency Whitening Serum",
        slug: "emergency-whitening-serum",
        sku: "NIY-EWS-003",
        sizeLabel: "3 ml",
        categorySlug: "facial-serum",
        shortDescription: "Potent intensive radiance serum ampoule for fast-acting complexion glow.",
        description:
          "Concentrated elixir targeting dullness and uneven appearance. Ideal for targeted spot radiance and high-impact skin illumination.",
        regularPricePaise: 29900, // ₹299 placeholder
        salePricePaise: null,
        stockQuantity: 150,
        lowStockThreshold: 20,
        status: "DRAFT" as const,
        isFeatured: true,
        tags: ["serum", "radiance", "ampoule"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/emergency-serum",
            alt: "NIYAT Emergency Whitening Serum 3ml",
            sortOrder: 0,
          },
        ],
      },
      {
        name: "Premium Face Serum",
        slug: "premium-face-serum",
        sku: "NIY-PFS-015",
        sizeLabel: "15 ml",
        categorySlug: "facial-serum",
        shortDescription: "Luxury daily anti-dullness face serum for refined, luminous texture.",
        description:
          "Enriched with botanical actives and potent skin conditioners to replenish vital nutrients, diminish tired appearance, and restore youthful radiance.",
        regularPricePaise: 79900, // ₹799 placeholder
        salePricePaise: null,
        stockQuantity: 40,
        lowStockThreshold: 10,
        status: "DRAFT" as const,
        isFeatured: true,
        tags: ["serum", "luxury", "anti-dullness"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
            publicId: "placeholder/premium-serum",
            alt: "NIYAT Premium Face Serum 15ml",
            sortOrder: 0,
          },
        ],
      },
    ];

    for (const prod of productDefs) {
      const categoryId = categoryMap.get(prod.categorySlug);
      if (!categoryId) continue;

      const { categorySlug, ...data } = prod;
      const productData = { ...data, categoryId };

      const doc = await Product.findOneAndUpdate(
        { sku: prod.sku },
        { $set: productData },
        { upsert: true, new: true }
      );
      console.log(` - Product ready: ${doc.name} (${doc.sku}) [${doc.status}]`);
    }

    // 3. Seed SiteSettings (Singleton)
    console.log("\n3. Seeding Default Site Settings...");
    await SiteSettings.findOneAndUpdate(
      { key: "default" },
      {
        $setOnInsert: {
          brandName: "NIYAT",
          currency: "INR",
          freeShippingThresholdPaise: 99900, // ₹999 free shipping
          standardShippingFeePaise: 9900, // ₹99 standard shipping
          codEnabled: true,
          codMinOrderPaise: 30000, // ₹300
          codMaxOrderPaise: 300000, // ₹3,000
          reservationTtlMinutes: 30,
          lowStockThresholdDefault: 5,
          taxRatePercent: 18,
          announcementBar: {
            enabled: true,
            text: "Complimentary shipping on orders above ₹999 | Discover Pure Radiance",
            link: "/shop",
          },
          contactEmail: "care@niyat.in",
          contactPhone: "+91 98765 43210",
        },
      },
      { upsert: true }
    );
    console.log(" - Site Settings configured.");

    // 4. Seed Welcome Coupon
    console.log("\n4. Seeding Initial Welcome Coupon...");
    await Coupon.findOneAndUpdate(
      { code: "WELCOME10" },
      {
        $set: {
          code: "WELCOME10",
          type: "PERCENTAGE",
          value: 10, // 10%
          maximumDiscountPaise: 20000, // Cap at ₹200
          minimumOrderPaise: 49900, // Min spend ₹499
          startsAt: new Date("2026-01-01"),
          expiresAt: new Date("2027-12-31"),
          usageLimit: 1000,
          perCustomerLimit: 1,
          status: "ACTIVE",
        },
      },
      { upsert: true }
    );
    console.log(" - Coupon ready: WELCOME10 (10% off up to ₹200)");

    console.log("\n=================================================");
    console.log("🎉 Database Seeding Completed Successfully!");
    console.log("=================================================");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();
