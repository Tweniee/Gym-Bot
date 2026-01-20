import axios, { AxiosInstance } from "axios";
import { config } from "../utils/config";
import { logger } from "../utils/logger";

export interface EmbeddingResponse {
  embedding: number[];
}

export interface ChatResponse {
  response: string;
  done: boolean;
}

export class OllamaClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.ollamaBaseUrl,
      timeout: 120000, // 2 minutes for LLM responses
    });
  }

  /**
   * Generate embeddings for text using nomic-embed-text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      logger.debug(`Generating embedding for text (${text.length} chars)`);

      const response = await this.client.post<EmbeddingResponse>(
        "/api/embeddings",
        {
          model: config.embeddingModel,
          prompt: text,
        },
      );

      return response.data.embedding;
    } catch (error) {
      logger.error("Failed to generate embedding", error);
      throw new Error("Embedding generation failed");
    }
  }

  /**
   * Generate chat completion using llama3
   */
  async generateChatCompletion(prompt: string): Promise<string> {
    try {
      logger.debug("Generating chat completion");

      const response = await this.client.post<ChatResponse>("/api/generate", {
        model: config.chatModel,
        prompt,
        stream: false,
      });

      return response.data.response;
    } catch (error) {
      logger.error("Failed to generate chat completion", error);
      throw new Error("Chat completion failed");
    }
  }

  /**
   * Check if Ollama is healthy and models are available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/api/tags");
      const models = response.data.models || [];

      const hasEmbeddingModel = models.some((m: { name: string }) =>
        m.name.includes(config.embeddingModel),
      );
      const hasChatModel = models.some((m: { name: string }) =>
        m.name.includes(config.chatModel),
      );

      if (!hasEmbeddingModel) {
        logger.warn(`Embedding model ${config.embeddingModel} not found`);
      }
      if (!hasChatModel) {
        logger.warn(`Chat model ${config.chatModel} not found`);
      }

      return hasEmbeddingModel && hasChatModel;
    } catch (error) {
      logger.error("Ollama health check failed", error);
      return false;
    }
  }
}

export const ollamaClient = new OllamaClient();
