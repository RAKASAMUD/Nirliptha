import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define path to the JSON file where titles will be saved.
// On Vercel, the filesystem is read-only except for /tmp.
const isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const DB_PATH = isVercel 
  ? path.join("/tmp", "titles-db.json") 
  : path.join(process.cwd(), "titles-db.json");

// In-memory fallback for Vercel (survives warm serverless invocations)
let memoryDB: Record<string, string> = {};
let isMemoryInitialized = false;

// Helper to read DB
function readDB() {
  if (isMemoryInitialized) return memoryDB;

  if (!fs.existsSync(DB_PATH)) {
    return memoryDB;
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    memoryDB = JSON.parse(data);
    isMemoryInitialized = true;
    return memoryDB;
  } catch (err) {
    return memoryDB;
  }
}

// Helper to write DB
function writeDB(data: any) {
  memoryDB = data;
  isMemoryInitialized = true;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Vercel filesystem write error, relying on memory:", e);
  }
}

export async function GET() {
  const data = readDB();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const { address, title } = await req.json();
    
    if (!address || !title) {
      return NextResponse.json({ error: "Missing address or title" }, { status: 400 });
    }

    const cleanAddr = address.toLowerCase();
    
    const db = readDB();
    db[cleanAddr] = title.trim();
    writeDB(db);

    return NextResponse.json({ success: true, db });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save title" }, { status: 500 });
  }
}
