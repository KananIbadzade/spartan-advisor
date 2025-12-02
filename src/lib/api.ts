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

/**
 * Call OpenAI with function calling support
 * @param prompt - The user's prompt/message
 * @param systemMessage - System message to set context
 * @param maxTokens - Max tokens for response
 * @param tools - Optional array of tool definitions
 * @returns Response object with content and potential tool calls
 */
export async function callOpenAIWithTools(
  prompt: string,
  systemMessage: string,
  maxTokens: number = 500,
  tools?: any[]
): Promise<{ content: string | null; toolCalls: any[] | null }> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  console.log('[API] Checking OpenAI API key...');
  if (!apiKey) {
    console.error('[API ERROR] OpenAI API key not found in environment variables');
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file.');
  }
  console.log('[API] OpenAI API key found');

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    const params: any = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = 'auto';
      console.log(`[API] Adding ${tools.length} tools to OpenAI request`);
    }

    console.log('[API] Sending request to OpenAI API...');
    console.log('[API] Request params:', {
      model: params.model,
      messageCount: params.messages.length,
      maxTokens: params.max_tokens,
      toolsCount: tools?.length || 0
    });

    const completion = await openai.chat.completions.create(params);

    console.log('[API] Received response from OpenAI');
    console.log('[API] Response details:', {
      choices: completion.choices.length,
      finishReason: completion.choices[0]?.finish_reason,
      hasMessage: !!completion.choices[0]?.message,
      hasContent: !!completion.choices[0]?.message?.content,
      hasToolCalls: !!completion.choices[0]?.message?.tool_calls
    });

    const message = completion.choices[0]?.message;

    if (!message) {
      console.error('[API ERROR] No message in OpenAI response');
      throw new Error('No response from OpenAI');
    }

    return {
      content: message.content,
      toolCalls: message.tool_calls || null
    };
  } catch (error) {
    console.error('[API ERROR] Error in callOpenAIWithTools:', error);
    if (error instanceof Error) {
      console.error('[API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
    throw new Error('Unknown error occurred while calling OpenAI');
  }
}
