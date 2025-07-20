const express = require("express");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { QdrantClient } = require("@qdrant/js-client-rest");
const { ChatCohere, CohereEmbeddings } = require("@langchain/cohere");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RunnableSequence } = require("@langchain/core/runnables");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { dbConnection, embeddingModel, model } = require("./config/model");
const { prompt } = require("../prompt");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const readLineSync = require("readline-sync");

const qdrantClient = dbConnection();

// Load environment variables
dotenv.config();

const app = express();

// function buildPrompt(context, question) {
//   return `
// You are a helpful assistant. Use the context below to answer the question.
// Only answer from context only nothing apart
// Context:
// ${context}

// Question: ${question}

// Answer:`;
// }

const insertPdfToQdrant = async function () {
  const pdfs = Array.from({ length: 8 }, (_, i) => `quantum-pdf-${i + 1}.pdf`);
  console.log(pdfs);

  for (const pdf of pdfs) {
    const filePath = path.join(__dirname, `./pdfs/${pdf}`);
    const pdfBuffer = fs.readFileSync(filePath);
    const orginalPdf = await pdfParse(pdfBuffer);

    console.log(`saving ${pdf}`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 450,
      chunkOverlap: 50,
    });

    const splittedDocs = await textSplitter.splitDocuments([
      {
        pageContent: orginalPdf.text,
        metadata: {},
      },
    ]);

    try {
      await qdrantClient.getCollections();
    } catch (err) {
      console.error("Qdrant not reachable:", err.message);
      process.exit(1);
    }

    const vectorStore = await QdrantVectorStore.fromDocuments(
      splittedDocs,
      embeddingModel,
      { client: qdrantClient, collectionName: "quantum-knowledge" }
    );

    console.log(vectorStore);
  }
};

app.listen(3000, async () => {
  console.log("Server started");

  // const trainDocument = readLineSync.question(
  //   "Do you wanna insert existing pdf's to db? Type yes to proceed "
  // );

  // if (trainDocument.toLowerCase().trim() === "yes") await insertPdfToQdrant();

  // while (true) {
  //   const userInput = readLineSync.question("Enter your prompt ");

  //   if (userInput.toLowerCase().trim() === "exit") {
  //     process.exit(1);
  //   }

  //   console.log("herrre", qdrantClient);
  //   const vectorStore = await QdrantVectorStore.fromExistingCollection(
  //     embeddingModel,
  //     { client: qdrantClient, collectionName: "quantum-knowledge" }
  //   );

  //   console.log("lp");
  //   const retriever = vectorStore.asRetriever();

  //   const ragChain = RunnableSequence.from([
  //     async (input) => {
  //       const docs = await retriever._getRelevantDocuments(input);

  //       const context = docs.map((doc) => doc.pageContent).join("\n---\n");

  //       // console.log(context, input)
  //       return { context, question: input };
  //     },

  //     prompt,
  //     model,
  //     // new StringOutputParser(),
  //   ]);

  //   console.log(ragChain);

  //   const response = await ragChain.invoke(userInput);
  //   console.log("Answer:", response.text);
  // }
});

app.use(express.json());

// Route to process question
app.post("/ask", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddingModel,
      { client: qdrantClient, collectionName: "quantum-knowledge" }
    );

    const retriever = vectorStore.asRetriever();

    const ragChain = RunnableSequence.from([
      async (input) => {
        const docs = await retriever._getRelevantDocuments(input);
        const context = docs.map((doc) => doc.pageContent).join("\n---\n");
        return { context, question: input };
      },
      prompt,
      model,
    ]);

    const response = await ragChain.invoke(message);

    res.json({ answer: response.text || "No response generated." });
  } catch (err) {
    console.error("Error processing message:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
