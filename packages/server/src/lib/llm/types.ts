/** A single content block — text or image */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** Message content can be a plain string or an array of content parts */
export type MessageContent = string | ContentPart[];

export interface GenerateParams {
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: MessageContent }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topK?: number;
  minP?: number;
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
