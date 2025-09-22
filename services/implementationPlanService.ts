import { supabase } from '../lib/supabase';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export interface ImplementationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedTime?: string;
  dependencies?: string[];
  toolsRequired?: string[];
  result?: any;
  error?: string;
}

export interface ImplementationPlan {
  id: string;
  query: string;
  context?: any;
  steps: ImplementationStep[];
  status: 'generating' | 'ready' | 'executing' | 'completed' | 'failed';
  totalEstimatedTime?: string;
  overview?: string;
}

export interface PlanProgressEvent {
  type: 'plan_generation_started' | 'plan_overview' | 'step_generated' | 'plan_generation_complete' | 'plan_generation_error' |
        'execution_started' | 'step_started' | 'step_completed' | 'step_failed' | 'execution_completed' | 'execution_error';
  planId: string;
  message?: string;
  overview?: string;
  totalEstimatedTime?: string;
  totalSteps?: number;
  step?: Partial<ImplementationStep>;
  stepId?: string;
  result?: any;
  error?: string;
}

class ImplementationPlanService {
  private getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    };
  };

  async generatePlan(
    query: string,
    context?: any,
    onProgress?: (event: PlanProgressEvent) => void
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch(`${MCP_BASE_URL}/implementation-plan/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          context,
          userId: user?.id,
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let planId = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'plan_generated') {
                  planId = data.planId;
                }
                
                if (onProgress) {
                  onProgress(data);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return planId;
    } catch (error) {
      console.error('❌ Error generating implementation plan:', error);
      throw error;
    }
  }

  async executePlan(
    planId: string,
    onProgress?: (event: PlanProgressEvent) => void
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch(`${MCP_BASE_URL}/implementation-plan/execute/${planId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (onProgress) {
                  onProgress(data);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Error executing implementation plan:', error);
      throw error;
    }
  }

  async getPlanStatus(planId: string): Promise<ImplementationPlan | null> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${MCP_BASE_URL}/implementation-plan/${planId}/status`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get plan status');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Error getting plan status:', error);
      throw error;
    }
  }

  async streamPlanProgress(
    planId: string,
    onProgress?: (event: PlanProgressEvent) => void
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${MCP_BASE_URL}/implementation-plan/${planId}/stream`, {
        headers,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (onProgress) {
                  onProgress(data);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Error streaming plan progress:', error);
      throw error;
    }
  }
}

export default new ImplementationPlanService();