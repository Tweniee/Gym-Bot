import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Ollama
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  embeddingModel: process.env.EMBEDDING_MODEL || "nomic-embed-text",
  chatModel: process.env.CHAT_MODEL || "llama3",

  // Qdrant
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME || "documents",

  // RAG Parameters
  chunkSize: parseInt(process.env.CHUNK_SIZE || "600", 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || "90", 10),
  topK: parseInt(process.env.TOP_K || "5", 10),
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.7"),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
} as const;
