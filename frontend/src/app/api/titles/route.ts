import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define path to the JSON file where titles will be saved.
// Storing it outside 'src' to avoid triggering hot reload on every save, 
// but for simplicity we can store it in the project root.
const DB_PATH = path.join(process.cwd(), "titles-db.json");

// Helper to read DB
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    return {};
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

// Helper to write DB
function writeDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
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
