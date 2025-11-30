/**
 * OpenAI API Integration using official SDK
 */

import OpenAI from 'openai';

/**
 * Call OpenAI Chat Completions API
 * @param prompt - The user's prompt/message
 * @param systemMessage - Optional system message to set context
 * @param maxTokens - Optional max tokens for response (default 500)
 * @returns The AI's response text
 */
export async function callOpenAI(
  prompt: string,
  systemMessage: string = "You are a helpful assistant for SJSU students, specializing in course planning and academic advising.",
  maxTokens: number = 500
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // You can change to 'gpt-4' if you have access
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error calling OpenAI:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred while calling OpenAI');
  }
}

/**
 * Call OpenAI with conversation history
 * @param messages - Array of conversation messages
 * @returns The AI's response text
 */
export async function callOpenAIWithHistory(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error calling OpenAI:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred while calling OpenAI');
  }
}
