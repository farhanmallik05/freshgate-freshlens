import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const candidatePaths = [
    path.resolve(process.cwd(), "../bench/results/latest.json"),
    path.resolve(process.cwd(), "bench/results/latest.json"),
    path.resolve(process.cwd(), "../../bench/results/latest.json"),
    path.resolve(__dirname, "../../../../../bench/results/latest.json"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf8");
        const json = JSON.parse(raw);
        return NextResponse.json({ exists: true, data: json });
      } catch (err) {
        return NextResponse.json(
          { exists: false, error: "Failed to parse benchmark results JSON" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    exists: false,
    message: "No benchmark results file found at bench/results/latest.json",
  });
}
