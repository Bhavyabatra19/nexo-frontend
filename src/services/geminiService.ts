import type { AIResponse } from '../types';

/**
 * Stub for landing AIDemo. For real AI analysis, use the dashboard Nexo AI (/api/chat) with CSV.
 */
export async function analyzeRelationship(_input: string): Promise<AIResponse> {
  return {
    relationshipScore: 0,
    summary: 'Connect your account and use Nexo AI in the dashboard for relationship insights.',
    reminders: [],
  };
}
