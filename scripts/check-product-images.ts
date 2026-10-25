import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { Product } from "../src/models/Product";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const products = await Product.find({}, "name slug images");
  console.log("PRODUCTS IN DATABASE:");
  for (const p of products) {
    console.log(`- ${p.name} (${p.slug}):`);
    console.log("  Images:", p.images);
  }
  await mongoose.disconnect();
}

main().catch(console.error);
