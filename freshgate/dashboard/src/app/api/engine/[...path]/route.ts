import { NextRequest, NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8787";
const ENGINE_API_KEY = process.env.ENGINE_API_KEY || "";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subpath = path.join("/");
  const url = new URL(req.url);
  const targetUrl = `${ENGINE_URL}/${subpath}${url.search}`;

  const headers: Record<string, string> = {};
  if (ENGINE_API_KEY) {
    headers["Authorization"] = `Bearer ${ENGINE_API_KEY}`;
  }

  // Handle SSE passthrough
  if (subpath === "v1/events") {
    try {
      const lastEventId = req.headers.get("Last-Event-ID") || req.headers.get("last-event-id");
      const sseHeaders: Record<string, string> = {
        ...headers,
        Accept: "text/event-stream",
      };
      if (lastEventId) {
        sseHeaders["Last-Event-ID"] = lastEventId;
      }

      const engineRes = await fetch(targetUrl, {
        headers: sseHeaders,
      });

      return new Response(engineRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch {
      return NextResponse.json({ error: "Failed connecting to engine SSE" }, { status: 502 });
    }
  }

  try {
    const engineRes = await fetch(targetUrl, { headers });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { error: "Engine connection failed", url: targetUrl },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subpath = path.join("/");
  const targetUrl = `${ENGINE_URL}/${subpath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ENGINE_API_KEY) {
    headers["Authorization"] = `Bearer ${ENGINE_API_KEY}`;
  }

  try {
    const body = await req.json();
    const engineRes = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Engine request failed" },
      { status: 502 }
    );
  }
}
