import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/models/Banner";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const catDir = path.join(imagesDir, "categories");
    fs.mkdirSync(catDir, { recursive: true });

    const basePath = "C:\\Users\\mainh\\.gemini\\antigravity-ide\\brain\\ddc43de3-c510-471b-b9f5-01825a8d6724";

    const filesToCopy: [string, string][] = [
      ["niyat_hero_woman_1792823381580.jpg", path.join(imagesDir, "hero-woman.jpg")],
      ["niyat_routine_banner_1792823406420.jpg", path.join(imagesDir, "routine-banner.jpg")],
      ["cat_face_wash_1792823491340.jpg", path.join(catDir, "face-wash.jpg")],
      ["cat_moisturizer_1792823514338.jpg", path.join(catDir, "moisturizers.jpg")],
      ["cat_serum_1792823537239.jpg", path.join(catDir, "serums.jpg")],
      ["cat_sunscreen_1792823559877.jpg", path.join(catDir, "sunscreen.jpg")],
      ["cat_face_mask_1792823585255.jpg", path.join(catDir, "face-masks.jpg")],
      ["cat_body_care_1792823612924.jpg", path.join(catDir, "body-care.jpg")],
      ["cat_hair_care_1792823636342.jpg", path.join(catDir, "hair-care.jpg")],
      ["cat_kits_combos_1792823666114.jpg", path.join(catDir, "kits-combos.jpg")],
    ];

    const copied: string[] = [];
    for (const [srcName, destPath] of filesToCopy) {
      const srcPath = path.join(basePath, srcName);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        copied.push(path.basename(destPath));
      }
    }

    await connectToDatabase();

    // 1. Sync Banner in MongoDB
    const existingHero = await Banner.findOne({ title: "Healthy Skin, Happier You" });
    if (!existingHero) {
      await Banner.create({
        title: "Healthy Skin, Happier You",
        subtitle:
          "Discover our range of skincare essentials made with nature's finest ingredients for glowing, healthy skin.",
        image: {
          url: "/images/hero-woman.jpg",
          publicId: "hero_radiance_main",
          alt: "NIYAT Natural Skincare Radiance Range",
        },
        placement: "HOME_HERO",
        targetUrl: "/shop",
        sortOrder: 0,
        status: "ACTIVE",
      });
    } else {
      existingHero.image.url = "/images/hero-woman.jpg";
      existingHero.sortOrder = 0;
      existingHero.status = "ACTIVE";
      await existingHero.save();
    }

    // 2. Sync Standard Skincare Categories
    const standardCategories = [
      {
        name: "Face Wash",
        slug: "face-wash",
        description: "Gentle, purifying cleansers that wash away impurities and revive radiant skin.",
        imageUrl: "/images/categories/face-wash.jpg",
        sortOrder: 1,
      },
      {
        name: "Moisturizers",
        slug: "moisturizers",
        description: "Hydrating and revitalizing creams crafted for deep skin nourishment.",
        imageUrl: "/images/categories/moisturizers.jpg",
        sortOrder: 2,
      },
      {
        name: "Serums",
        slug: "serums",
        description: "Concentrated botanical and active serums for intensive rejuvenation.",
        imageUrl: "/images/categories/serums.jpg",
        sortOrder: 3,
      },
      {
        name: "Sunscreen",
        slug: "sunscreen",
        description: "Broad-spectrum daily defense shielding skin against harmful UVA & UVB rays.",
        imageUrl: "/images/categories/sunscreen.jpg",
        sortOrder: 4,
      },
      {
        name: "Face Masks",
        slug: "face-masks",
        description: "Detoxifying and illuminating clay and sheet masks for weekly restoration.",
        imageUrl: "/images/categories/face-masks.jpg",
        sortOrder: 5,
      },
      {
        name: "Body Care",
        slug: "body-care",
        description: "Luxurious, deeply nourishing lotions and balms for head-to-toe hydration.",
        imageUrl: "/images/categories/body-care.jpg",
        sortOrder: 6,
      },
      {
        name: "Hair Care",
        slug: "hair-care",
        description: "Botanical shampoos, scalp oils, and nourishing elixirs for luscious hair.",
        imageUrl: "/images/categories/hair-care.jpg",
        sortOrder: 7,
      },
      {
        name: "Kits & Combos",
        slug: "kits-combos",
        description: "Curated multi-step skincare routines and seasonal beauty bundles.",
        imageUrl: "/images/categories/kits-combos.jpg",
        sortOrder: 8,
      },
    ];

    const categoryMap = new Map<string, string>(); // slug -> category _id string

    for (const cat of standardCategories) {
      let doc = await Category.findOne({ slug: cat.slug });
      if (!doc) {
        doc = await Category.create({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: {
            url: cat.imageUrl,
            publicId: `cat_${cat.slug}`,
            alt: cat.name,
          },
          sortOrder: cat.sortOrder,
          status: "ACTIVE",
        });
      } else {
        doc.name = cat.name;
        doc.description = cat.description;
        doc.image = {
          url: cat.imageUrl,
          publicId: doc.image?.publicId || `cat_${cat.slug}`,
          alt: cat.name,
        };
        doc.sortOrder = cat.sortOrder;
        doc.status = "ACTIVE";
        await doc.save();
      }
      categoryMap.set(cat.slug, String(doc._id));
    }

    // 3. Migrate legacy seed categories to standard ones
    // facial-cleanser -> face-wash
    // face-cream -> moisturizers
    // facial-serum -> serums
    // sun-protection -> sunscreen
    const legacySlugMap: Record<string, string> = {
      "facial-cleanser": "face-wash",
      "face-cream": "moisturizers",
      "facial-serum": "serums",
      "sun-protection": "sunscreen",
    };

    for (const [oldSlug, newSlug] of Object.entries(legacySlugMap)) {
      const oldCat = await Category.findOne({ slug: oldSlug });
      const newCatId = categoryMap.get(newSlug);
      if (oldCat && newCatId) {
        // Re-link products pointing to oldCat
        await Product.updateMany(
          { categoryId: oldCat._id },
          { $set: { categoryId: newCatId } }
        );
        // Archive the old category so it doesn't appear on storefront
        oldCat.status = "ARCHIVED";
        await oldCat.save();
      }
    }

    // 4. Ensure products are linked to the right categories based on product slug/name
    const allProducts = await Product.find({});
    for (const prod of allProducts) {
      const s = prod.slug.toLowerCase();
      let targetSlug = "face-wash";
      if (s.includes("wash") || s.includes("cleanser")) targetSlug = "face-wash";
      else if (s.includes("cream") || s.includes("moisturizer")) targetSlug = "moisturizers";
      else if (s.includes("serum")) targetSlug = "serums";
      else if (s.includes("sunscreen") || s.includes("sun")) targetSlug = "sunscreen";
      else if (s.includes("lotion") || s.includes("body")) targetSlug = "body-care";
      else if (s.includes("mask")) targetSlug = "face-masks";
      else if (s.includes("hair")) targetSlug = "hair-care";
      else if (s.includes("kit") || s.includes("combo")) targetSlug = "kits-combos";

      const targetCatId = categoryMap.get(targetSlug);
      if (targetCatId && String(prod.categoryId) !== targetCatId) {
        prod.categoryId = targetCatId as any;
      }
      // Ensure product is PUBLISHED
      if (prod.status !== "PUBLISHED") {
        prod.status = "PUBLISHED";
      }
      await prod.save();
    }

    const activeCount = await Category.countDocuments({ status: "ACTIVE" });
    const productCount = await Product.countDocuments({ status: "PUBLISHED" });

    return NextResponse.json({
      success: true,
      copied,
      activeCategories: activeCount,
      publishedProducts: productCount,
      categories: standardCategories.map((c) => c.name),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
