import { Request, Response } from 'express';
import { ImplementationPlanService } from '../services/implementationPlanService';

export class ImplementationPlanController {
  static async generatePlan(req: Request, res: Response) {
    try {
      const { query, context, userId } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required',
          timestamp: new Date().toISOString(),
        });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const planId = await ImplementationPlanService.generateAndStreamPlan(
        query,
        context,
        userId,
        (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      );

      // Send final plan ID
      res.write(`data: ${JSON.stringify({ 
        type: 'plan_generated', 
        planId,
        status: 'ready_for_execution'
      })}\n\n`);

    } catch (error) {
      console.error('Error generating implementation plan:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate plan'
      })}\n\n`);
    }
  }

  static async executePlan(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const { userId } = req.body;

      // Set up Server-Sent Events for execution streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      await ImplementationPlanService.executePlan(
        planId,
        userId,
        (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      );

    } catch (error) {
      console.error('Error executing implementation plan:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to execute plan'
      })}\n\n`);
    }
  }

  static async getPlanStatus(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const status = await ImplementationPlanService.getPlanStatus(planId);

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting plan status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get plan status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async streamPlanProgress(req: Request, res: Response) {
    try {
      const { planId } = req.params;

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      await ImplementationPlanService.streamPlanProgress(
        planId,
        (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      );

    } catch (error) {
      console.error('Error streaming plan progress:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to stream plan progress'
      })}\n\n`);
    }
  }
}