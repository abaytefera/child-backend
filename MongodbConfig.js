import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MONGO_URI;

let client;
let dbInstance;

export async function Connectdb() {
  if (dbInstance) return dbInstance; // reuse existing connection

  try {
    if (!client) {
      client = new MongoClient(url); // <-- remove unsupported options
      await client.connect(); // connect to MongoDB
      console.log("MongoDB connected");
    }

    dbInstance = client.db("out-of-the-ashe-db"); // your DB name
    return dbInstance;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}

// Only close when the server is shutting down
export async function Closedb() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log("MongoDB connection closed");
  }
}
