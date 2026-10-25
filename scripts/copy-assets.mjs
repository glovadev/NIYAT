import fs from "fs";
import path from "path";

const targetDir = path.join(process.cwd(), "public", "images");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sourceHero = "C:\\Users\\mainh\\.gemini\\antigravity-ide\\brain\\ddc43de3-c510-471b-b9f5-01825a8d6724\\niyat_hero_woman_1792823381580.jpg";
const sourceRoutine = "C:\\Users\\mainh\\.gemini\\antigravity-ide\\brain\\ddc43de3-c510-471b-b9f5-01825a8d6724\\niyat_routine_banner_1792823406420.jpg";

if (fs.existsSync(sourceHero)) {
  fs.copyFileSync(sourceHero, path.join(targetDir, "hero-woman.jpg"));
  console.log("Copied hero-woman.jpg");
}

if (fs.existsSync(sourceRoutine)) {
  fs.copyFileSync(sourceRoutine, path.join(targetDir, "routine-banner.jpg"));
  console.log("Copied routine-banner.jpg");
}
