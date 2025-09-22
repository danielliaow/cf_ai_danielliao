import { AIService } from './aiService';
import { v4 as uuidv4 } from 'uuid';

interface ImplementationStep {
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

interface ImplementationPlan {
  id: string;
  query: string;
  context?: any;
  userId: string;
  steps: ImplementationStep[];
  status: 'generating' | 'ready' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  totalEstimatedTime?: string;
}

// In-memory storage for plans (in production, use database)
const plans = new Map<string, ImplementationPlan>();
const planCallbacks = new Map<string, ((data: any) => void)[]>();

export class ImplementationPlanService {
  static async generateAndStreamPlan(
    query: string,
    context: any,
    userId: string,
    callback: (data: any) => void
  ): Promise<string> {
    const planId = uuidv4();
    
    // Initialize plan
    const plan: ImplementationPlan = {
      id: planId,
      query,
      context,
      userId,
      steps: [],
      status: 'generating',
      createdAt: new Date(),
    };
    
    plans.set(planId, plan);

    try {
      // Stream plan generation status
      callback({
        type: 'plan_generation_started',
        planId,
        message: 'Analyzing query and generating implementation plan...'
      });

      // Use AI to generate implementation plan
      const planPrompt = `You are an expert task planner. Create a detailed implementation plan for complex, multi-step tasks.

User Query: "${query}"
Context: ${JSON.stringify(context, null, 2)}

Instructions:
1. Break down the task into 3-6 specific, actionable steps
2. Each step should be a distinct operation that produces a result
3. Focus on major phases, not micro-steps
4. Be realistic with time estimates

Respond with ONLY a JSON object (no markdown, no explanations):

{
  "overview": "Brief overview of what will be accomplished",
  "totalEstimatedTime": "5-15 minutes",
  "steps": [
    {
      "title": "Action verb + object",
      "description": "What exactly this step accomplishes",
      "estimatedTime": "2-5 minutes",
      "toolsRequired": ["specific tool names"],
      "dependencies": []
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, nothing else.`;

      const aiService = new AIService();
      const aiResponse = await aiService.processQuery({
        query: planPrompt,
        timestamp: new Date().toISOString(),
        preferences: { 
          responseStyle: 'brief', 
          includeActions: false
        }
      }, userId);
      
      let planData;
      try {
        // Extract JSON from AI response
        let responseText = aiResponse.naturalResponse;
        
        // Try to find JSON in the response using multiple strategies
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
          // Try to find JSON between code blocks
          jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1]; // Use the captured group
          }
        }
        
        if (!jsonMatch) {
          // Try to extract from the entire response if it looks like JSON
          responseText = responseText.trim();
          if (responseText.startsWith('{') && responseText.endsWith('}')) {
            jsonMatch = [responseText];
          }
        }
        
        if (jsonMatch) {
          console.log('📝 Extracted JSON:', jsonMatch[0]);
          planData = JSON.parse(jsonMatch[0]);
          
          // Validate the structure
          if (!planData.steps || !Array.isArray(planData.steps)) {
            throw new Error('Invalid plan structure: missing steps array');
          }
          if (planData.steps.length === 0) {
            throw new Error('Invalid plan structure: empty steps array');
          }
        } else {
          console.warn('⚠️ No JSON found in AI response:', responseText);
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI plan response:', parseError);
        console.error('📄 Raw AI response:', aiResponse.naturalResponse);
        // Fallback to a basic plan
        planData = this.generateFallbackPlan(query);
      }

      // Convert plan data to implementation steps
      const steps: ImplementationStep[] = planData.steps.map((step: any, index: number) => ({
        id: `step-${index + 1}`,
        title: step.title,
        description: step.description,
        status: 'pending' as const,
        estimatedTime: step.estimatedTime,
        dependencies: step.dependencies || [],
        toolsRequired: step.toolsRequired || [],
      }));

      // Update plan with generated steps
      plan.steps = steps;
      plan.status = 'ready';
      plan.totalEstimatedTime = planData.totalEstimatedTime;
      plans.set(planId, plan);

      // Stream each step as it's generated
      callback({
        type: 'plan_overview',
        planId,
        overview: planData.overview,
        totalEstimatedTime: planData.totalEstimatedTime,
        totalSteps: steps.length
      });

      for (const step of steps) {
        callback({
          type: 'step_generated',
          planId,
          step: {
            id: step.id,
            title: step.title,
            description: step.description,
            estimatedTime: step.estimatedTime,
            toolsRequired: step.toolsRequired,
            status: step.status
          }
        });
        
        // Add small delay to make streaming visible
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      callback({
        type: 'plan_generation_complete',
        planId,
        message: 'Implementation plan generated successfully!'
      });

      return planId;
    } catch (error) {
      plan.status = 'failed';
      plans.set(planId, plan);
      
      callback({
        type: 'plan_generation_error',
        planId,
        error: error instanceof Error ? error.message : 'Failed to generate plan'
      });
      
      throw error;
    }
  }

  static async executePlan(
    planId: string,
    userId: string,
    callback: (data: any) => void
  ): Promise<void> {
    const plan = plans.get(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    if (plan.status !== 'ready') {
      throw new Error('Plan is not ready for execution');
    }

    try {
      plan.status = 'executing';
      plans.set(planId, plan);

      callback({
        type: 'execution_started',
        planId,
        message: 'Starting implementation plan execution...'
      });

      // Execute steps in order, respecting dependencies
      for (const step of plan.steps) {
        // Check if dependencies are completed
        const pendingDependencies = step.dependencies?.filter(depId => {
          const depStep = plan.steps.find(s => s.id === depId);
          return depStep && depStep.status !== 'completed';
        }) || [];

        if (pendingDependencies.length > 0) {
          callback({
            type: 'step_waiting',
            planId,
            stepId: step.id,
            message: `Waiting for dependencies: ${pendingDependencies.join(', ')}`
          });
          continue;
        }

        // Execute step
        step.status = 'in_progress';
        callback({
          type: 'step_started',
          planId,
          stepId: step.id,
          title: step.title,
          description: step.description
        });

        try {
          // Simulate step execution by calling appropriate tools/services
          const result = await this.executeStep(step, plan.query, userId);
          
          step.status = 'completed';
          step.result = result;
          
          callback({
            type: 'step_completed',
            planId,
            stepId: step.id,
            result: result,
            message: `✅ ${step.title} completed successfully`
          });
        } catch (stepError) {
          step.status = 'failed';
          step.error = stepError instanceof Error ? stepError.message : 'Step execution failed';
          
          callback({
            type: 'step_failed',
            planId,
            stepId: step.id,
            error: step.error,
            message: `❌ ${step.title} failed: ${step.error}`
          });
          
          // Continue with other steps unless it's a critical failure
        }

        // Add delay between steps
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
      const failedSteps = plan.steps.filter(s => s.status === 'failed').length;

      if (failedSteps === 0) {
        plan.status = 'completed';
        callback({
          type: 'execution_completed',
          planId,
          message: `🎉 Implementation plan completed successfully! (${completedSteps}/${plan.steps.length} steps)`
        });
      } else {
        plan.status = 'completed'; // Still mark as completed even with some failures
        callback({
          type: 'execution_completed_with_errors',
          planId,
          message: `⚠️ Implementation plan completed with ${failedSteps} failed steps. (${completedSteps}/${plan.steps.length} successful)`
        });
      }

      plan.completedAt = new Date();
      plans.set(planId, plan);

    } catch (error) {
      plan.status = 'failed';
      plans.set(planId, plan);
      
      callback({
        type: 'execution_error',
        planId,
        error: error instanceof Error ? error.message : 'Execution failed'
      });
      
      throw error;
    }
  }

  static async executeStep(step: ImplementationStep, originalQuery: string, userId: string): Promise<any> {
    // This is where we'd integrate with your existing AI/tool execution system
    try {
      // For now, simulate step execution based on step type
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
      
      // In a real implementation, you'd:
      // 1. Analyze the step description
      // 2. Determine which tools/APIs to call
      // 3. Execute the actual work
      // 4. Return the result
      
      return {
        message: `Step "${step.title}" executed successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to execute step "${step.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getPlanStatus(planId: string): Promise<ImplementationPlan | null> {
    return plans.get(planId) || null;
  }

  static async streamPlanProgress(planId: string, callback: (data: any) => void): Promise<void> {
    const plan = plans.get(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Register callback for this plan
    if (!planCallbacks.has(planId)) {
      planCallbacks.set(planId, []);
    }
    planCallbacks.get(planId)!.push(callback);

    // Send current plan status
    callback({
      type: 'plan_status',
      plan: {
        id: plan.id,
        status: plan.status,
        steps: plan.steps.map(step => ({
          id: step.id,
          title: step.title,
          status: step.status,
          result: step.result,
          error: step.error
        }))
      }
    });
  }

  static generateFallbackPlan(query: string) {
    return {
      overview: "Execute the requested task step by step",
      totalEstimatedTime: "5-10 minutes",
      steps: [
        {
          title: "Analyze Request",
          description: "Understand and break down the user's request",
          estimatedTime: "1-2 minutes",
          toolsRequired: ["AI Analysis"],
          dependencies: []
        },
        {
          title: "Execute Task",
          description: "Perform the main task as requested",
          estimatedTime: "3-5 minutes",
          toolsRequired: ["Relevant APIs/Tools"],
          dependencies: ["step-1"]
        },
        {
          title: "Verify Results",
          description: "Check that the task was completed successfully",
          estimatedTime: "1-2 minutes",
          toolsRequired: ["Verification Tools"],
          dependencies: ["step-2"]
        }
      ]
    };
  }
}