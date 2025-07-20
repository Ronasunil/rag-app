const { ChatCohere, CohereEmbeddings } = require("@langchain/cohere");
const dotenv = require("dotenv");

const { QdrantClient } = require("@qdrant/js-client-rest");

dotenv.config();

const model = new ChatCohere({ apiKey: process.env.COHERE_API_KEY });

const embeddingModel = new CohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY,
  model: "embed-english-v3.0",
});

const dbConnection = function () {
  const client = new QdrantClient({
    url: "http://localhost:6333",
    checkCompatibility: false,
  });
  return client;
};

module.exports = {
  model,
  embeddingModel,
  dbConnection,
};


