import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { ObjectId } from "mongodb";

import { routerlogin } from "./authLogin.js";
import { routerEmployees } from "./Employee.js";
import { routerChild } from "./Child.js";
import { UserRouter } from "./User.js";
import { messageRouter } from "./message.js";
import { Connectdb } from "./MongodbConfig.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 8080;

/* =========================
    CORS 
========================= */
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
  credentials: true
}));

/* =========================
    BODY PARSERS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
    ROUTES
========================= */
app.use("/login", routerlogin);
app.use("/Employees", routerEmployees);
app.use("/Child", routerChild);
app.use("/User", UserRouter);
app.use("/message", messageRouter);

/* =========================
    MONGODB CONNECTION
========================= */
Connectdb()
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err.message));


const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("onlineuser", Array.from(onlineUsers.keys()));
  });

  socket.on("send_message", async (data) => {
    try {
      const msg = {
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text,
        isRead: false,
        createdAt: new Date()
      };

      const db = await Connectdb();
      if (!db) return;

      const conversationsDb = db.collection("conversations");
      const messagesDb = db.collection("messages");

      const conversation = await conversationsDb.findOne({
        participants: { $all: [data.senderId, data.receiverId] }
      });

      if (conversation) {
        await conversationsDb.updateOne(
          { _id: new ObjectId(conversation._id) },
          {
            $set: {
              lastMessage: data.text,
              updatedAt: new Date(),
              [`unreadCount.${data.receiverId}`]:
                (conversation.unreadCount?.[data.receiverId] || 0) + 1
            }
          }
        );

        await messagesDb.insertOne({
          ...msg,
          conversationId: conversation._id
        });
      } else {
        const newConversation = {
          participants: [data.senderId, data.receiverId],
          lastMessage: data.text,
          updatedAt: new Date(),
          unreadCount: {
            [data.senderId]: 0,
            [data.receiverId]: 1
          }
        };

        const result = await conversationsDb.insertOne(newConversation);
        await messagesDb.insertOne({
          ...msg,
          conversationId: result.insertedId
        });
      }

      io.to(data.receiverId).emit("receive_message", msg);
      io.emit("sussfully_send_message", msg);

    } catch (err) {
      console.error("send_message error:", err.message);
    }
  });

  socket.on("mark_as_read", async (data) => {
    try {
      const db = await Connectdb();
      if (!db) return;

      await db.collection("conversations").updateOne(
        { participants: { $all: [data.id, data.otherId] } },
        { $set: { [`unreadCount.${data.id}`]: 0 } }
      );

      socket.emit("succfuly_mark_as_read", data);
    } catch (err) {
      console.error(err.message);
    }
  });

  socket.on("both_message_mark", async (data) => {
    try {
      const db = await Connectdb();
      if (!db) return;

      await db.collection("conversations").updateOne(
        { participants: { $all: [data.id, data.other_id] } },
        {
          $set: {
            [`unreadCount.${data.id}`]: 0,
            [`unreadCount.${data.other_id}`]: 0
          }
        }
      );

      io.to(data.id).emit("both_succfuly_mark_as_read", data);
      io.to(data.other_id).emit("both_succfuly_mark_as_read", data);
    } catch (err) {
      console.error(err.message);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

/* =========================
    START SERVER
========================= */
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
