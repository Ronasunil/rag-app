const express = require("express");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { Chroma } = require("@langchain/community/vectorstores/chroma");
const { Document } = require("langchain/document");
const { ChromaClient } = require("chromadb");
const { ChatCohere, CohereEmbeddings } = require("@langchain/cohere");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RunnableSequence } = require("@langchain/core/runnables");

// Load environment variables
dotenv.config();

// Create embeddings and chat model
const embeddingModel = new CohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY,
  model: "embed-english-v3.0",
});

const model = new ChatCohere({
  apiKey: process.env.COHERE_API_KEY,
});

const app = express();

function buildPrompt(context, question) {
  return `
You are a helpful assistant. Use the context below to answer the question.
Only answer from context only nothing apart
Context:
${context}

Question: ${question}

Answer:`;
}

app.listen(3000, async () => {
  console.log("Server started");

  const filePath = path.join(__dirname, "../p165.pdf");
  const pdfBuffer = fs.readFileSync(filePath);
  const pdf = await pdfParse(pdfBuffer);

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 450,
    chunkOverlap: 50,
  });

  const splittedDocs = await textSplitter.splitDocuments([
    { pageContent: pdf.text, metadata: {} },
  ]);

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splittedDocs,
    embeddingModel
  );

  const retriever = vectorStore.asRetriever();

  const ragChain = RunnableSequence.from([
    async (input) => {
      const docs = await retriever._getRelevantDocuments(input);

      const context = docs.map((doc) => {
        console.log(doc)
        return doc.pageContent
      });
      console.log(context, input);

      return buildPrompt(context, input);
    },
    model,
  ]);

  const question = "what this document is about";
  const response = await ragChain.invoke(question);
  console.log("Answer:", response.text);
});
