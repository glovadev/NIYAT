import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { Banner } from "../src/models/Banner";

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const count = await Banner.countDocuments({ placement: "HOME_HERO" });
  if (count === 0) {
    console.log("Seeding initial 3 Hero Banners into Atlas...");
    await Banner.insertMany([
      {
        title: "Whitening Cream",
        subtitle: "Signature botanical radiance formulation with 24-hour nourishment to illuminate, protect, and revitalize.",
        image: {
          url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1920&q=85",
          publicId: "hero_whitening_cream",
          alt: "NIYAT Luxury Whitening Cream",
        },
        placement: "HOME_HERO",
        targetUrl: "/products/whitening-cream",
        sortOrder: 0,
        status: "ACTIVE",
      },
      {
        title: "Sunscreen SPF 50",
        subtitle: "Non-greasy, broad-spectrum UV protection shielding skin barrier while preserving a pure, natural dewy glow.",
        image: {
          url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1920&q=85",
          publicId: "hero_sunscreen",
          alt: "NIYAT Sunscreen Broad Spectrum",
        },
        placement: "HOME_HERO",
        targetUrl: "/products/sunscreen",
        sortOrder: 1,
        status: "ACTIVE",
      },
      {
        title: "Purifying Face Wash",
        subtitle: "Deep pore cleanser removing daily impurities while locking in moisture with soothing botanical extracts.",
        image: {
          url: "https://images.unsplash.com/photo-1556228722-d0b7194dfa14?auto=format&fit=crop&w=1920&q=85",
          publicId: "hero_face_wash",
          alt: "NIYAT Purifying Face Wash",
        },
        placement: "HOME_HERO",
        targetUrl: "/products/face-wash",
        sortOrder: 2,
        status: "ACTIVE",
      },
    ]);
    console.log("Successfully seeded 3 Hero Banners!");
  } else {
    console.log(`Found ${count} existing Hero Banners in database.`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("Error seeding banners:", e);
  process.exit(1);
});
