import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let client;
let dbInstance;

export async function Connectdb() {
  if (dbInstance) return dbInstance;

  try {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URI);
      await client.connect(); // ensures connection is open
      console.log("MongoDB connected");
    }
    dbInstance = client.db("out-of-the-ashe-db");
    return dbInstance;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
}

export async function Closedb() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
  }
}
