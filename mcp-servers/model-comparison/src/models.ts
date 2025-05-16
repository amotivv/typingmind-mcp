export interface GptModel {
  multimodal: boolean;
  maxContext: number;
  strengths: string[];
  idealUseCases: string[];
  pricing: {
    input: number; // $ per 1M tokens
    output: number; // $ per 1M tokens
  };
  limitations: string[];
}

export const models: Record<string, GptModel> = {
  "GPT-4.1": {
    multimodal: false,
    maxContext: 1000000, // 1M tokens
    strengths: [
      "Advanced coding (54.6% on SWE-bench Verified)",
      "Long-context processing",
      "10.5% improvement on instruction following vs GPT-4o"
    ],
    idealUseCases: [
      "Software development",
      "Large document analysis",
      "Complex data processing"
    ],
    pricing: {
      input: 3.00, // $ per 1M tokens
      output: 8.00
    },
    limitations: [
      "API-only access (not in ChatGPT interface)",
      "Released without public safety report"
    ]
  },
  "GPT-4o": {
    multimodal: true,
    maxContext: 128000, // 128K tokens
    strengths: [
      "Real-time multimodal interactions",
      "Superior in vision tasks and non-English languages",
      "Faster than earlier GPT-4"
    ],
    idealUseCases: [
      "General-purpose AI tasks",
      "Visual analysis",
      "Multilingual applications"
    ],
    pricing: {
      input: 1.50,
      output: 10.00
    },
    limitations: [
      "Free tier has limited message quota",
      "Available in both API and ChatGPT interface"
    ]
  },
  "GPT-4.5": {
    multimodal: true,
    maxContext: 128000, // 128K tokens
    strengths: [
      "Enhanced emotional intelligence",
      "More natural and intuitive interactions",
      "Stronger aesthetic intuition and creativity"
    ],
    idealUseCases: [
      "Customer service",
      "Creative writing",
      "Coaching and communication"
    ],
    pricing: {
      input: 75.00,
      output: 150.00
    },
    limitations: [
      "Only supports text and image inputs (no audio/video)",
      "Available to ChatGPT Plus and Team users"
    ]
  },
  "GPT-4.1-Mini": {
    multimodal: false,
    maxContext: 1000000, // 1M tokens
    strengths: [
      "Cost-effective performance",
      "Nearly halves response latency",
      "Matches or surpasses GPT-4o on intelligence benchmarks"
    ],
    idealUseCases: [
      "Startups and SMEs",
      "Mobile AI applications",
      "Interactive agents"
    ],
    pricing: {
      input: 0.40,
      output: 1.60
    },
    limitations: [
      "API-only access",
      "Reduced capabilities vs full GPT-4.1"
    ]
  },
  "GPT-4.1-Nano": {
    multimodal: false,
    maxContext: 1000000, // 1M tokens
    strengths: [
      "Lightweight and fastest in GPT-4.1 series",
      "80.1% on MMLU, 50.3% on GPQA",
      "Optimized for edge deployment"
    ],
    idealUseCases: [
      "Mobile applications",
      "Edge computing",
      "IoT devices",
      "Real-time monitoring"
    ],
    pricing: {
      input: 0.10,
      output: 0.40
    },
    limitations: [
      "API-only access",
      "Further reduced capabilities for lightweight applications"
    ]
  },
  "GPT-4o-Mini": {
    multimodal: true,
    maxContext: 128000, // 128K tokens
    strengths: [
      "Fast, affordable small model",
      "Balanced price-performance ratio",
      "Retains multimodal capabilities"
    ],
    idealUseCases: [
      "Focused tasks",
      "Cost-sensitive deployments",
      "Mobile applications"
    ],
    pricing: {
      input: 0.15,
      output: 0.60
    },
    limitations: [
      "API-only access",
      "Reduced capabilities vs full GPT-4o"
    ]
  },
  "o3": {
    multimodal: true,
    maxContext: 200000, // 200K tokens
    strengths: [
      "Most powerful reasoning model",
      "Excels at math, science, coding",
      "Superior technical writing"
    ],
    idealUseCases: [
      "Multi-step reasoning",
      "Complex problem-solving",
      "Technical analysis"
    ],
    pricing: {
      input: 10.00,
      output: 40.00
    },
    limitations: [
      "API-only access",
      "Reasoning token support",
      "Slowest response times"
    ]
  },
  "o4-mini": {
    multimodal: true,
    maxContext: 200000, // 200K tokens
    strengths: [
      "Faster, affordable reasoning",
      "Efficient performance in coding",
      "Strong visual reasoning"
    ],
    idealUseCases: [
      "Programming tasks",
      "Visual analysis",
      "Cost-sensitive reasoning"
    ],
    pricing: {
      input: 1.10,
      output: 4.40
    },
    limitations: [
      "API-only access",
      "Reasoning token support",
      "Medium response speed"
    ]
  },
  "o1": {
    multimodal: true,
    maxContext: 200000, // 200K tokens
    strengths: [
      "Previous generation reasoning model",
      "Thinks before answering with chain of thought",
      "Strong problem-solving"
    ],
    idealUseCases: [
      "Complex reasoning tasks",
      "Detailed analysis",
      "Step-by-step thinking"
    ],
    pricing: {
      input: 15.00,
      output: 60.00
    },
    limitations: [
      "API-only access",
      "Reasoning token support",
      "Slow response times"
    ]
  },
  "GPT-3.5-Turbo": {
    multimodal: false,
    maxContext: 16000, // 16K tokens
    strengths: [
      "Fast response time",
      "Cost-effective for simple tasks",
      "Widely supported"
    ],
    idealUseCases: [
      "Simple Q&A",
      "Content generation",
      "Budget-constrained applications"
    ],
    pricing: {
      input: 0.50,
      output: 1.50
    },
    limitations: [
      "Limited reasoning abilities",
      "Less accurate than newer models",
      "Smaller context window"
    ]
  }
};

export type TaskType = "code_generation" | "creative_writing" | "qa" | "summarization" | "general";

export const taskPatterns: Record<TaskType, RegExp[]> = {
  "code_generation": [/code/i, /function/i, /program/i, /algorithm/i, /implement/i, /class/i],
  "creative_writing": [/story/i, /creative/i, /write a/i, /poem/i, /fiction/i, /narrative/i],
  "qa": [/what is/i, /how do/i, /explain/i, /why/i, /when did/i, /where/i, /who/i],
  "summarization": [/summarize/i, /summary/i, /overview/i, /tldr/i, /brief/i, /condense/i],
  "general": [/.*/] // Fallback pattern
};

export interface OutputRatio {
  min: number;
  expected: number;
  max: number;
}

export const outputRatios: Record<TaskType, OutputRatio> = {
  "code_generation": { min: 1.5, expected: 2.5, max: 4.0 },
  "creative_writing": { min: 2.0, expected: 3.5, max: 6.0 },
  "qa": { min: 0.8, expected: 1.5, max: 3.0 },
  "summarization": { min: 0.3, expected: 0.5, max: 0.8 },
  "general": { min: 1.0, expected: 2.0, max: 3.0 }
};