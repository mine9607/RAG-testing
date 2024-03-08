"use client";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { useEffect, useState } from "react";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { PodSpec } from "@pinecone-database/pinecone";
import { Tiktoken } from "js-tiktoken";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const loader = new CheerioWebBaseLoader("https://docs.smith.langchain.com/user_guide");

//----------------------------------------------------
// Load the data - retrieve the raw data
const loadDocs = async () => {
  const docs = await loader.load();
  // console.log(docs.length);
  // console.log(docs[0].pageContent.length);
  // console.log(docs);
  return docs;
};

//----------------------------------------------------
// Chunk the data
const splitter = new RecursiveCharacterTextSplitter();

const splitDocs = async () => {
  const docs = await loadDocs();

  const splitDocuments = await splitter.splitDocuments(docs);
  // console.log(splitDocuments.length);
  // console.log(splitDocuments[0].pageContent.length);
  // console.log(splitDocuments);
  return splitDocuments;
};
splitDocs();

//----------------------------------------------------
// Configure the embedding model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  dimensions: 512,
});

//----------------------------------------------------
// Calculate tokenization cost

//----------------------------------------------------
// Connect to Pinecone Vector DB
const pinecone = new Pinecone({
  apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY,
});
console.log(pinecone);

//----------------------------------------------------
// Find all indexes and console log their names
const getIndexes = async () => {
  const response = await pinecone.listIndexes();
  const indexes = response.indexes;
  indexes.map((index) => {
    console.log(index.name);
  });
  return indexes[0].name;
};
getIndexes();

//----------------------------------------------------
// Describe Index
const descIndex = async (indexName) => {
  const response = await pinecone.describeIndex(indexName);
  console.log(response);
};
descIndex("testindex");

//----------------------------------------------------
//Delete an index by name
const deleteIndex = async (indexName) => {
  const response = await pinecone.listIndexes();
  if (!response.indexes.includes(indexName)) {
    return;
  }
  await pinecone.deleteIndex(indexName);
};
// deleteIndex("testing");

//----------------------------------------------------
// Create a new index
// const createIndex = async () => {
//   await pc.createIndex({
//     name: "starter-index",
//     dimension: 512,
//     metric: "cosine",
//     spec: {
//       pod: {
//         environment: "gcp-starter",
//       },
//     },
//   });
// };

// (async () => {
//   createIndex();
//   try {
//     await createIndex();
//   } catch (error) {
//     console.error(error);
//   }
// })(); //Bug with the product - code is implemented as shown in the documentation but it doesn't work - code at docs.pinecone.io/docs/create-an-index

//----------------------------------------------------
// Create a vector store

const vectorStore = async () => {
  let indexName = await getIndexes();
  const pineconeIndex = pinecone.Index(indexName);

  const splitDocuments = await splitDocs();
  console.log("splitDocuments:", splitDocuments); // Debug line
  const response = await PineconeStore.fromDocuments(splitDocuments, embeddings, { pineconeIndex });
  console.log(response._vectorstoreType);
};
vectorStore();
//----------------------------------------------------

// Create a retrieval chain

//----------------------------------------------------
// Prompt the retrieval chain

//----------------------------------------------------
prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a world class technical documentation writer."],
  ["user", "{input}"],
]);

const chain = prompt.pipe(chatModel);
const outputParser = new StringOutputParser();
const llmChain = prompt.pipe(chatModel).pipe(outputParser);

export default function OpenAI() {
  const [response, setResponse] = useState({
    chatResponse: "",
    chatPrompt: "",
    chatWithParser: "",
  });

  const chat = async () => {
    const input = "What is LangSmith?";
    const response = await chatModel.invoke(input);
    setResponse((prevState) => ({ ...prevState, chatResponse: response.content }));
  };

  const chatPrompt = async () => {
    const response = await chain.invoke({
      input: "What is LangSmith?",
    });
    setResponse((prevState) => ({ ...prevState, chatPrompt: response.content }));
  };

  const chatWithParser = async () => {
    const response = await llmChain.invoke({
      input: "What is LangSmith?",
    });
    setResponse((prevState) => ({ ...prevState, chatWithParser: response }));
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={chat} className="bg-gray-500 rounded-lg">
        Chat
      </button>
      <p>{response.chatResponse}</p>
      <button onClick={chatPrompt} className="bg-gray-500 rounded-lg">
        Chat Prompt
      </button>
      <p>{response.chatPrompt}</p>
      <button onClick={chatWithParser} className="bg-gray-500 rounded-lg">
        Chat with Parser
      </button>
      <p>{response.chatWithParser}</p>
    </div>
  );
}
