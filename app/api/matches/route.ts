import { NextResponse } from "next/server";
import { rankCandidates } from "../../lib/matching";

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 }
    );
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("requiredSkills" in payload) ||
    !Array.isArray(payload.requiredSkills) ||
    payload.requiredSkills.length === 0 ||
    payload.requiredSkills.length > 12 ||
    !payload.requiredSkills.every(
      (skill) => typeof skill === "string" && skill.length <= 48
    )
  ) {
    return NextResponse.json(
      { error: "Provide 1–12 skill names, each 48 characters or fewer." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    mode: "demo-heuristic",
    note: "Sample profiles and explainable rule-based scores. This is a recommendation, not a hiring decision.",
    matches: rankCandidates(payload.requiredSkills),
  });
}
