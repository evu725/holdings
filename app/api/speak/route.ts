export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!apiKey || !voiceId) {
      return Response.json(
        { error: "Text-to-speech is not configured" },
        { status: 501 },
      );
    }

    let body: { text?: unknown };
    try {
      body = (await request.json()) as { text?: unknown };
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
      },
    );

    if (!response.ok || !response.body) {
      return Response.json(
        { error: "ElevenLabs request failed" },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch {
    return Response.json({ error: "Failed to synthesize speech" }, { status: 500 });
  }
}
