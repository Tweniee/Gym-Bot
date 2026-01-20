import { ollamaClient } from "../llm/ollamaClient";
import { retrievalService } from "../retrieval/retrievalService";
import { logger } from "../utils/logger";

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export class ChatService {
  /**
   * System prompt that enforces strict retrieval-only answering
   */
  private readonly SYSTEM_PROMPT = `You are a helpful assistant that answers questions based ONLY on the provided context documents.

CRITICAL RULES:
1. Answer ONLY using information from the context documents provided below
2. If the answer is not in the context, respond with: "I don't know based on the provided documents."
3. Do NOT use your general knowledge or training data
4. Do NOT make assumptions or inferences beyond what's explicitly stated
5. Do NOT hallucinate or fabricate information
6. If you're uncertain, say "I don't know"
7. Keep answers concise and factual
8. Quote or reference specific parts of the context when possible

Your goal is accuracy and honesty, not helpfulness at the cost of correctness.`;

  /**
   * Build the complete prompt with context and question
   */
  private buildPrompt(context: string, question: string): string {
    if (!context || context.trim().length === 0) {
      return `${this.SYSTEM_PROMPT}

CONTEXT: No relevant documents found.

QUESTION: ${question}

ANSWER:`;
    }

    return `${this.SYSTEM_PROMPT}

CONTEXT DOCUMENTS:
${context}

QUESTION: ${question}

ANSWER:`;
  }

  /**
   * Process a chat request using RAG pipeline
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    try {
      logger.info(`Processing chat request: "${request.question}"`);

      // Step 1: Retrieve relevant chunks
      const relevantChunks = await retrievalService.retrieveRelevantChunks(
        request.question,
      );

      // Step 2: Format context
      const context = retrievalService.formatContext(relevantChunks);
      const sources = retrievalService.extractSources(relevantChunks);

      // Step 3: Build prompt
      const prompt = this.buildPrompt(context, request.question);

      // Step 4: Generate answer
      let answer: string;

      if (relevantChunks.length === 0) {
        answer =
          "I don't know based on the provided documents. No relevant information was found.";
        logger.info("No relevant chunks found, returning default response");
      } else {
        answer = await ollamaClient.generateChatCompletion(prompt);
        logger.info("Generated answer from LLM");
      }

      return {
        answer: answer.trim(),
        sources,
      };
    } catch (error) {
      logger.error("Chat processing failed", error);
      throw new Error("Failed to process chat request");
    }
  }
}

export const chatService = new ChatService();
