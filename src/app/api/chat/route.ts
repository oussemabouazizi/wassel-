import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { CUSTOMER_SYSTEM_PROMPT, ADMIN_SYSTEM_PROMPT } from '@/lib/ai/gemini';
import { CUSTOMER_TOOLS, ADMIN_TOOLS, executeTool } from '@/lib/ai/tools';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const GROQ_MODEL = 'llama-3.1-8b-instant';

async function runChatLoop(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  tools: any[],
  role: 'customer' | 'admin'
): Promise<string> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Tunis' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Tunis' });

  const chatMessages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const m of messages) {
    chatMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  const lastMsg = chatMessages[chatMessages.length - 1];
  if (lastMsg.role === 'user') {
    lastMsg.content += `\n\n[Context: Current time is ${timeStr}, Date: ${dateStr}, Timezone: Africa/Tunis (CET), User role: ${role}]`;
  }

  let loopCount = 0;
  const MAX_LOOPS = 5;

  while (loopCount < MAX_LOOPS) {
    const params: any = {
      model: GROQ_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1024,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = 'auto';
    }

    const response = await groq.chat.completions.create(params);
    const choice = response.choices?.[0];

    if (!choice) {
      return 'No response from AI.';
    }

    const assistantMessage = choice.message;

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return assistantMessage.content || 'No response from AI.';
    }

    chatMessages.push({
      role: 'assistant',
      content: assistantMessage.content || null,
      tool_calls: assistantMessage.tool_calls,
    });

    for (const tc of assistantMessage.tool_calls) {
      const fnName = tc.function.name;
      let fnArgs: Record<string, string> = {};
      try {
        fnArgs = JSON.parse(tc.function.arguments || '{}');
      } catch { fnArgs = {}; }

      try {
        const result = await executeTool(fnName, fnArgs);
        chatMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      } catch (err: any) {
        chatMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: err.message }),
        });
      }
    }

    loopCount++;
  }

  return 'I gathered the data but could not generate a final response. Please try again.';
}

export async function POST(request: Request) {
  try {
    const { messages, role = 'customer' } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ reply: 'AI service is not configured. Please contact support.' });
    }

    const systemPrompt = role === 'admin' ? ADMIN_SYSTEM_PROMPT : CUSTOMER_SYSTEM_PROMPT;
    const tools = role === 'admin' ? ADMIN_TOOLS : CUSTOMER_TOOLS;

    const reply = await runChatLoop(
      messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      systemPrompt,
      tools as any[],
      role
    );

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Chat API error:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    if (error?.status === 429) {
      return NextResponse.json({ reply: 'AI service is temporarily rate-limited. Please wait a moment and try again.' });
    }
    return NextResponse.json({ reply: 'Sorry, something went wrong. Please try again.', debug: error?.message });
  }
}
