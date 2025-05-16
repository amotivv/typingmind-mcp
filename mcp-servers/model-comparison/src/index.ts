import { McpToolServer } from '@modelcontextprotocol/sdk/server/tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { models, TaskType } from './models';
import { 
  detectTaskType,
  detectVerbosity,
  estimateOutputTokens,
  countTokens,
  findOptimalModel,
  approximateTokenCount
} from './utils';
import express from 'express';

// Create the MCP server
const server = new McpServer({
  name: "GPT Model Comparison",
  version: "1.0.0",
  description: "Tools for comparing and selecting optimal GPT models based on task requirements and cost considerations"
});

// Tool 1: Get optimal model based on task requirements
server.tool(
  "get_optimal_model",
  {
    task_type: z.enum(["code_generation", "creative_writing", "qa", "summarization", "general"]),
    context_length: z.number().default(1000),
    multimodal_required: z.boolean().default(false),
    optimize_for: z.enum(["cost", "performance", "balanced"]).default("balanced"),
    max_budget: z.number().optional(),
    required_features: z.array(z.string()).optional()
  },
  async ({ task_type, context_length, multimodal_required, optimize_for, max_budget, required_features }) => {
    // Find the optimal model based on requirements
    const result = findOptimalModel({
      taskType: task_type as TaskType,
      contextLength: context_length,
      multimodalRequired: multimodal_required,
      optimizeFor: optimize_for as "cost" | "performance" | "balanced",
      maxBudget: max_budget,
      requiredFeatures: required_features
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Tool 2: Estimate text cost
server.tool(
  "estimate_text_cost",
  {
    text: z.string(),
    models: z.array(z.string()).optional(),
    force_brevity: z.boolean().default(false),
    expected_output: z.union([
      z.number(), // Exact token count
      z.enum(["brief", "medium", "detailed"]) // Predefined categories
    ]).optional()
  },
  async ({ text, models: requestedModels, force_brevity, expected_output }) => {
    // Calculate token count
    const inputTokens = await countTokens(text).catch(error => {
      console.error("Error counting tokens:", error);
      return approximateTokenCount(text);
    });

    // Detect task type and verbosity
    const taskType = detectTaskType(text);
    const verbosity = force_brevity ? "low" : detectVerbosity(text);

    // Estimate output tokens - either use expected_output or estimate automatically
    let outputEstimate;
    
    if (expected_output !== undefined) {
      if (typeof expected_output === "number") {
        // Direct token count
        const count = expected_output;
        outputEstimate = {
          conservative: Math.round(count * 0.7), // 30% less than expected
          expected: count,
          maximum: Math.round(count * 1.5) // 50% more than expected
        };
      } else {
        // Category selection
        const tokenMap = {
          "brief": 100,
          "medium": 500, 
          "detailed": 1500
        };
        const count = tokenMap[expected_output];
        outputEstimate = {
          conservative: Math.round(count * 0.7),
          expected: count,
          maximum: Math.round(count * 1.5)
        };
      }
    } else {
      // Fall back to the existing estimation logic
      outputEstimate = estimateOutputTokens(inputTokens, taskType, verbosity);
    }

    // Calculate costs for requested models or default to popular ones
    const modelsToCheck = requestedModels || 
      ["GPT-4.1", "GPT-4o", "GPT-4.1-Mini", "GPT-4o-Mini", "GPT-3.5-Turbo"];
    
    const modelEstimates = modelsToCheck
      .filter(modelName => models[modelName]) // Filter out invalid model names
      .map(modelName => {
        const model = models[modelName];
        
        const inputCost = (inputTokens / 1000000) * model.pricing.input;
        const outputCosts = {
          conservative: (outputEstimate.conservative / 1000000) * model.pricing.output,
          expected: (outputEstimate.expected / 1000000) * model.pricing.output,
          maximum: (outputEstimate.maximum / 1000000) * model.pricing.output
        };

        return {
          model: modelName,
          input_cost: `$${inputCost.toFixed(6)}`,
          output_estimates: {
            conservative: { 
              tokens: outputEstimate.conservative, 
              cost: `$${outputCosts.conservative.toFixed(6)}` 
            },
            expected: { 
              tokens: outputEstimate.expected, 
              cost: `$${outputCosts.expected.toFixed(6)}` 
            },
            maximum: { 
              tokens: outputEstimate.maximum, 
              cost: `$${outputCosts.maximum.toFixed(6)}` 
            }
          },
          total_cost_ranges: `$${(inputCost + outputCosts.conservative).toFixed(6)} - $${(inputCost + outputCosts.maximum).toFixed(6)}`
        };
      });

    // Find cheapest model based on expected output
    let cheapestModel = modelEstimates[0]?.model || "Unknown";
    let lowestExpectedCost = Number.MAX_VALUE;
    
    modelEstimates.forEach(estimate => {
      const expectedCost = parseFloat(estimate.output_estimates.expected.cost.replace('$', ''));
      if (expectedCost < lowestExpectedCost) {
        lowestExpectedCost = expectedCost;
        cheapestModel = estimate.model;
      }
    });

    // Calculate potential savings
    const maxCostModel = modelEstimates.reduce((max, current) => {
      const currentCost = parseFloat(current.output_estimates.expected.cost.replace('$', ''));
      const maxCost = parseFloat(max.output_estimates.expected.cost.replace('$', ''));
      return currentCost > maxCost ? current : max;
    }, modelEstimates[0]);
    
    const maxCost = parseFloat(maxCostModel.output_estimates.expected.cost.replace('$', ''));
    const savings = maxCost > 0 ? Math.round((1 - (lowestExpectedCost / maxCost)) * 100) : 0;

    const result = {
      input_analysis: {
        input_tokens: inputTokens,
        detected_task_type: taskType,
        verbosity: verbosity
      },
      model_estimates: modelEstimates,
      recommended_model: cheapestModel,
      savings: `${savings}% cost reduction vs ${maxCostModel.model}`
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Tool 3: Get model details
server.tool(
  "get_model_details",
  {
    model: z.string()
  },
  async ({ model: modelName }) => {
    const model = models[modelName];
    
    if (!model) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: `Model '${modelName}' not found`,
              available_models: Object.keys(models)
            }, null, 2)
          }
        ]
      };
    }

    const result = {
      name: modelName,
      multimodal: model.multimodal,
      max_context: `${(model.maxContext / 1000).toFixed(0)}K tokens`,
      strengths: model.strengths,
      ideal_use_cases: model.idealUseCases,
      pricing: {
        input: `$${model.pricing.input.toFixed(2)} per 1M tokens`,
        output: `$${model.pricing.output.toFixed(2)} per 1M tokens`
      },
      limitations: model.limitations
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Tool 4: Compare models
server.tool(
  "compare_models",
  {
    models: z.array(z.string()),
    comparison_aspects: z.array(z.string()).optional()
  },
  async ({ models: modelNames, comparison_aspects }) => {
    const aspects = comparison_aspects || ["pricing", "context_window", "multimodal", "strengths"];
    
    // Filter to only include valid models
    const validModelNames = modelNames.filter(name => models[name]);
    
    if (validModelNames.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "No valid models specified",
              available_models: Object.keys(models)
            }, null, 2)
          }
        ]
      };
    }

    // Create comparison object
    const comparison: Record<string, any> = {};
    
    validModelNames.forEach(name => {
      const model = models[name];
      const modelInfo: Record<string, any> = {};
      
      if (aspects.includes("pricing")) {
        modelInfo.pricing = {
          input: `$${model.pricing.input.toFixed(2)} per 1M tokens`,
          output: `$${model.pricing.output.toFixed(2)} per 1M tokens`
        };
      }
      
      if (aspects.includes("context_window")) {
        modelInfo.context_window = `${(model.maxContext / 1000).toFixed(0)}K tokens`;
      }
      
      if (aspects.includes("multimodal")) {
        modelInfo.multimodal = model.multimodal;
      }
      
      if (aspects.includes("strengths")) {
        modelInfo.strengths = model.strengths;
      }
      
      if (aspects.includes("ideal_use_cases")) {
        modelInfo.ideal_use_cases = model.idealUseCases;
      }
      
      if (aspects.includes("limitations")) {
        modelInfo.limitations = model.limitations;
      }
      
      comparison[name] = modelInfo;
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(comparison, null, 2)
        }
      ]
    };
  }
);

// Tool 5: List all available models
server.tool(
  "list_models",
  {
    categories: z.array(z.string()).optional(),
    include_details: z.boolean().default(false)
  },
  async ({ categories, include_details }) => {
    // Group models by categories if requested
    if (categories && categories.length > 0) {
      const categorizedModels: Record<string, string[]> = {};
      
      // Create requested categories
      categories.forEach(category => {
        categorizedModels[category] = [];
      });
      
      // Add each model to appropriate categories
      Object.entries(models).forEach(([name, model]) => {
        if (categories.includes("flagship") && 
          (name === "GPT-4.1" || name === "GPT-4o" || name === "GPT-4.5")) {
          categorizedModels["flagship"].push(name);
        }
        
        if (categories.includes("multimodal") && model.multimodal) {
          categorizedModels["multimodal"].push(name);
        }
        
        if (categories.includes("cost-optimized") && 
          (name.includes("Mini") || name.includes("Nano"))) {
          categorizedModels["cost-optimized"].push(name);
        }
        
        if (categories.includes("reasoning") && 
          (name === "o1" || name === "o3" || name === "o4-mini")) {
          categorizedModels["reasoning"].push(name);
        }
        
        if (categories.includes("legacy") && 
          (name === "GPT-3.5-Turbo" || name === "GPT-4")) {
          categorizedModels["legacy"].push(name);
        }
      });
      
      // If details are requested, expand each model with basic info
      if (include_details) {
        const result: Record<string, any> = {};
        
        for (const [category, modelNames] of Object.entries(categorizedModels)) {
          result[category] = modelNames.map(name => {
            const model = models[name];
            return {
              name,
              multimodal: model.multimodal,
              max_context: `${(model.maxContext / 1000).toFixed(0)}K tokens`,
              pricing: {
                input: `$${model.pricing.input.toFixed(2)} per 1M tokens`,
                output: `$${model.pricing.output.toFixed(2)} per 1M tokens`
              }
            };
          });
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(categorizedModels, null, 2)
          }
        ]
      };
    }
    
    // Simple list of all models
    if (include_details) {
      const modelDetails = Object.entries(models).map(([name, model]) => ({
        name,
        multimodal: model.multimodal,
        max_context: `${(model.maxContext / 1000).toFixed(0)}K tokens`,
        pricing: {
          input: `$${model.pricing.input.toFixed(2)} per 1M tokens`,
          output: `$${model.pricing.output.toFixed(2)} per 1M tokens`
        }
      }));
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(modelDetails, null, 2)
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(Object.keys(models), null, 2)
        }
      ]
    };
  }
);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create MCP tool server
const toolServer = new McpToolServer({
  server,
  port: parseInt(PORT.toString(), 10),
});

// Simple homepage
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>GPT Model Comparison MCP Server</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          h1, h2, h3 { margin-top: 1.5em; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
          th { background-color: #f8f8f8; }
        </style>
      </head>
      <body>
        <h1>GPT Model Comparison MCP Server</h1>
        <p>This MCP server provides tools for comparing and selecting optimal GPT models based on task requirements and cost considerations.</p>
        
        <h2>Available Tools:</h2>
        <ul>
          <li><strong>get_optimal_model</strong> - Get the optimal model based on task requirements</li>
          <li><strong>estimate_text_cost</strong> - Analyze text to estimate costs across models</li>
          <li><strong>get_model_details</strong> - Get comprehensive information about a specific model</li>
          <li><strong>compare_models</strong> - Compare multiple models side-by-side</li>
          <li><strong>list_models</strong> - Get a complete list of all available models with optional categorization</li>
        </ul>
        
        <h2>MCP Endpoints:</h2>
        <ul>
          <li>MCP HTTP Endpoint: <code>/mcp</code> - Connect via MCP clients</li>
        </ul>
        
        <h2>Server Status:</h2>
        <p>✅ MCP Server running on port ${PORT}</p>
      </body>
    </html>
  `);
});

// Start the server
toolServer.listen().then(() => {
  console.log(`GPT Model Comparison MCP Server running on port ${PORT}`);
  console.log(`- MCP endpoint: http://localhost:${PORT}/mcp`);
});