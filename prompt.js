const { PromptTemplate } = require("@langchain/core/prompts");

const prompt = PromptTemplate.fromTemplate(`
    Answer the question only based on the context

    context:{context}

    question:{question}
    `);

module.exports = { prompt };
