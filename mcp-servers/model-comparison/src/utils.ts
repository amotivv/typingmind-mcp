import { models, taskPatterns, outputRatios, TaskType } from './models';
import * as tiktoken from 'tiktoken-node';

/**
 * Detect the most likely task type based on the input text
 */
export function detectTaskType(text: string): TaskType {
  let bestMatch: TaskType = "general";
  let maxMatches = 0;
  
  for (const [task, patterns] of Object.entries(taskPatterns) as [TaskType, RegExp[]][]) {
    const matches = patterns.filter(pattern => pattern.test(text)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = task;
    }
  }
  
  return bestMatch;
}

/**
 * Detect verbosity level based on keywords in the text
 */
export function detectVerbosity(text: string): "high" | "medium" | "low" {
  const highVerbosityKeywords = [
    "detailed", "comprehensive", "thorough", "in-depth", "elaborate", 
    "extensive", "explain", "detailed explanation", "comprehensive overview"
  ];
  
  const lowVerbosityKeywords = [
    "brief", "concise", "short", "summarize", "quickly", "tldr", 
    "in a few words", "briefly", "summary", "one sentence"
  ];
  
  const highVerbosity = highVerbosityKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  const lowVerbosity = lowVerbosityKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  
  if (highVerbosity && !lowVerbosity) return "high";
  if (lowVerbosity && !highVerbosity) return "low";
  return "medium";
}

/**
 * Estimate the likely number of output tokens based on input length, task type, and verbosity
 */
export function estimateOutputTokens(
  inputTokens: number, 
  taskType: TaskType, 
  verbosity: "high" | "medium" | "low"
): { conservative: number; expected: number; maximum: number } {
  const ratios = outputRatios[taskType] || outputRatios.general;
  
  // Apply verbosity adjustments
  let multiplier = 1.0;
  if (verbosity === "high") multiplier = 1.5;
  if (verbosity === "low") multiplier = 0.7;
  
  return {
    conservative: Math.round(inputTokens * ratios.min * multiplier),
    expected: Math.round(inputTokens * ratios.expected * multiplier),
    maximum: Math.round(inputTokens * ratios.max * multiplier)
  };
}

/**
 * Count tokens in a text string using tiktoken or fallback to approximation
 */
export async function countTokens(text: string, modelName = "gpt-4"): Promise<number> {
  try {
    return approximateTokenCount(text);
  } catch (error) {
    console.error("Token counting error, using approximation:", error);
    return approximateTokenCount(text);
  }
}

/**
 * Simple approximation of token count (about 4 chars per token for English)
 */
export function approximateTokenCount(text: string): number {
  // Simple approximation: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Find the optimal model based on task requirements
 */
export function findOptimalModel(params: {
  taskType: TaskType;
  contextLength: number;
  multimodalRequired: boolean;
  optimizeFor: "cost" | "performance" | "balanced";
  maxBudget?: number;
  requiredFeatures?: string[];
}): {
  recommendedModel: string;
  reasoning: string;
  alternatives: { model: string; tradeOff: string }[];
  estimatedCosts: Record<string, string>;
} {
  const { taskType, contextLength, multimodalRequired, optimizeFor, maxBudget, requiredFeatures = [] } = params;
  
  // Filter models by basic requirements
  const eligibleModels = Object.entries(models)
    .filter(([_, model]) => {
      // Check context window
      if (model.maxContext < contextLength) return false;
      
      // Check multimodal requirement
      if (multimodalRequired && !model.multimodal) return false;
      
      // Check max budget if provided
      if (maxBudget !== undefined) {
        // Estimate cost for this model (assuming 1:1 input:output ratio for simple calculation)
        const inputCost = (contextLength / 1000000) * model.pricing.input;
        const outputCost = (contextLength / 1000000) * model.pricing.output;
        const totalCost = inputCost + outputCost;
        
        if (totalCost > maxBudget) return false;
      }
      
      return true;
    })
    .map(([name, model]) => ({ name, model }));
  
  if (eligibleModels.length === 0) {
    // Return the most suitable model even if it doesn't meet all criteria
    return {
      recommendedModel: "GPT-3.5-Turbo", // Fallback to cheapest
      reasoning: "No models fully meet the specified requirements. Using GPT-3.5-Turbo as fallback.",
      alternatives: [],
      estimatedCosts: { "GPT-3.5-Turbo": "Lowest cost option" }
    };
  }
  
  // Score models based on optimization preference
  const scoredModels = eligibleModels.map(({ name, model }) => {
    let score = 0;
    
    // Input cost per token (normalized)
    const costScore = 1 - (model.pricing.input / 100); // Lower is better
    
    // Performance score (based on model recency and capabilities)
    // Using a simple heuristic for now - newer models are assumed better
    const performanceMap: Record<string, number> = {
      "GPT-4.5": 1.0,
      "GPT-4.1": 0.95,
      "o3": 0.93,
      "GPT-4o": 0.9,
      "o4-mini": 0.85,
      "o1": 0.8,
      "GPT-4.1-Mini": 0.75,
      "GPT-4o-Mini": 0.7,
      "GPT-4.1-Nano": 0.65,
      "GPT-3.5-Turbo": 0.5
    };
    
    const performanceScore = performanceMap[name] || 0.5;
    
    // Calculate final score based on optimization preference
    if (optimizeFor === "cost") {
      score = costScore * 0.8 + performanceScore * 0.2;
    } else if (optimizeFor === "performance") {
      score = costScore * 0.2 + performanceScore * 0.8;
    } else { // balanced
      score = costScore * 0.5 + performanceScore * 0.5;
    }
    
    // Adjust score based on task type compatibility
    if (taskType === "code_generation" && name.includes("4.1")) {
      score += 0.1; // GPT-4.1 is especially good for coding
    }
    
    if (taskType === "creative_writing" && name.includes("GPT-4.5")) {
      score += 0.1; // GPT-4.5 is especially good for creative tasks
    }
    
    return { name, model, score };
  }).sort((a, b) => b.score - a.score);
  
  // Top model is our recommendation
  const recommended = scoredModels[0];
  
  // Calculate estimated costs
  const estimatedCosts: Record<string, string> = {};
  scoredModels.forEach(({ name, model }) => {
    const inputCost = (contextLength / 1000000) * model.pricing.input;
    const outputCost = (contextLength / 1000000) * model.pricing.output;
    const totalCost = inputCost + outputCost;
    estimatedCosts[name] = `$${totalCost.toFixed(4)}`;
  });
  
  // Prepare alternatives (up to 2)
  const alternatives = scoredModels.slice(1, 3).map(({ name, model, score }) => {
    let tradeOff = "";
    
    if (score > recommended.score - 0.1) {
      if (model.pricing.input < recommended.model.pricing.input) {
        tradeOff = "Lower cost but potentially lower quality";
      } else {
        tradeOff = "Higher quality but more expensive";
      }
    } else if (model.multimodal && !recommended.model.multimodal) {
      tradeOff = "Supports multimodal inputs that the recommended model doesn't";
    } else {
      tradeOff = "Alternative option with different capabilities";
    }
    
    return { model: name, tradeOff };
  });
  
  return {
    recommendedModel: recommended.name,
    reasoning: `Selected based on ${taskType} task with ${contextLength} tokens, optimizing for ${optimizeFor}.`,
    alternatives,
    estimatedCosts
  };
}