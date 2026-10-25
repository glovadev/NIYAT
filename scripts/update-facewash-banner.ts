import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { Banner } from "../src/models/Banner";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const res = await Banner.updateOne(
    { title: "Purifying Face Wash" },
    {
      $set: {
        "image.url": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1920&q=85",
        "image.publicId": "hero_face_wash_active",
      },
    }
  );
  console.log("Updated banner:", res);
  await mongoose.disconnect();
}

main().catch(console.error);
