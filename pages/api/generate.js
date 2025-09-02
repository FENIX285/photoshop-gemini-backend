export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: "API key not configured on the server" });
  }

  const { prompt, base64Image, mode } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  let requestParts = [{ text: prompt }];
  if (mode === 'edit' && base64Image) {
    requestParts.push({ inlineData: { mimeType: "image/png", data: base64Image } });
  }

  const requestBody = {
    contents: [{ parts: requestParts }],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`;

  try {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      console.error("Gemini API Error:", error);
      return res.status(geminiResponse.status).json({ error: "Failed to get response from Gemini", details: error });
    }

    const data = await geminiResponse.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart) {
      res.status(200).json({ base64Image: imagePart.inlineData.data });
    } else {
      res.status(500).json({ error: "No image found in Gemini response", details: data });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
