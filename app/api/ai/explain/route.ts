import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { passage, question, choices, correctIndex, wrongChoices } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const wrongLabels = (wrongChoices || [])
      .map((idx: number) => choices[idx])
      .filter(Boolean)
      .join(", ");

    const systemPrompt = `You are a helpful and kind AI tutor. Analyse the passage, question, choices, correct choice, and the student's wrong choices.
Generate a response in Korean containing:
1. "hint1": A 1st stage hint (in Korean) that gives a soft conceptual nudge without directly revealing the correct answer or choice.
2. "hint2": A 2nd stage hint (in Korean) that is more specific and references details from the passage or choices, still guiding them to the correct answer.
3. "explanation": A detailed solution explanation (in Korean) of why the correct choice is right and why the student's selected wrong choice(s) is incorrect.

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "hint1": "string containing the 1st hint",
  "hint2": "string containing the 2nd hint",
  "explanation": "string containing the full explanation"
}`;

    const userPrompt = `Passage:
${passage}

Question:
${question}

Choices:
${choices.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}

Correct choice:
${choices[correctIndex]}

Student's wrong choice(s) selected:
${wrongLabels || "None (Explain the question generally)"}

Please generate the progressive hints and explanation in Korean.`;

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return NextResponse.json(
        { error: `OpenAI API failed: ${errText}` },
        { status: apiRes.status }
      );
    }

    const data = await apiRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI model." },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
