const { ChatCohere, CohereEmbeddings } = require("@langchain/cohere");
const dotenv = require("dotenv");
const {} =  require("chromadb")

dotenv.config();

const model = new ChatCohere({ apiKey: process.env.COHERE_API_KEY });

const embeddingModel = new CohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY,
  model: "embed-english-v3.0",
});

module.exports = {
  model,
  embeddingModel,
};
