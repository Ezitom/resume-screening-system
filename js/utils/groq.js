// groq.js
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
console.log("Groq API key type:", typeof GROQ_API_KEY);

export async function askGroq(prompt) {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";

  } catch (error) {
    console.error("Groq error:", error);
    throw new Error("AI call failed: " + error.message);
  }
}
