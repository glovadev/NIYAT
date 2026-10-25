import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { Product } from "../src/models/Product";

async function publishAll() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const result = await Product.updateMany({}, { $set: { status: "PUBLISHED" } });
  console.log(`✅ Updated ${result.modifiedCount} products to PUBLISHED status.`);
  await mongoose.disconnect();
}

publishAll();
