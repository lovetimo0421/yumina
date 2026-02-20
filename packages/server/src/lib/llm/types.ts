export interface GenerateParams {
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  /** Request JSON structured output from the model */
  responseFormat?: { type: "json_object" };
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Model {
  id: string;
  name: string;
  contextLength: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
  provider?: string;
}

export interface LLMProvider {
  generateStream(params: GenerateParams): AsyncIterable<StreamChunk>;
  listModels(): Promise<Model[]>;
  verify?(): Promise<boolean>;
}
