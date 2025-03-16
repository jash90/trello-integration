import OpenAI from 'openai';
export async function generateTaskDescription(prompt: string, taskCount = 5, apiKey?: string): Promise<string> {
  const model = localStorage.getItem('selectedModel') || 'o1-preview';
  const openai = new OpenAI({
    apiKey: apiKey || import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
  try {
    const completion = await openai.chat.completions.create({
      messages: [
                {
          role: String(model).includes("o1") ? "assistant": "system",
          content: "You are a helpful assistant that creates well-structured Trello tasks. Format the response as a JSON array with 'title' and 'description' fields."
        },
        {
          role: "user",
          content: `Przygotuj ${taskCount} zadań praktycznych związanych z ${prompt}, dzięki którym można się nauczyć jak działają, do każdego zadania dodaj tytuł i opis, w opisie powinien znajdować się treść zadania, cel oraz jeśli to będzie potrzebne będą terminy oraz opis co oznaczają, zwróć wszystko jako json`
        }
      ],
      model: model,
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Failed to generate task description');
  }
}