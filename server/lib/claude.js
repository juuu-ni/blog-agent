import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = 'claude-sonnet-4-6';

export default client;
