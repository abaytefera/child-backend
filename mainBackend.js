import express from "express";
import { routerlogin } from "./authLogin.js";
import { routerEmployees } from "./Employee.js";
import cors from "cors";
import { routerChild } from "./Child.js";
import { Connectdb } from "./MongodbConfig.js";
import { UserRouter } from "./User.js";
import { Server } from "socket.io";
import { messageRouter } from "./message.js";
import { createServer } from "http";
import { ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 8080;

// Parse CLIENT_URL into array for CORS
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:5173"];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET","POST","PUT","PATCH","DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/login", routerlogin);
app.use("/Employees", routerEmployees);
app.use("/Child", routerChild);
app.use("/User", UserRouter);
app.use("/message", messageRouter);

// Async MongoDB connection (does not block server startup)
Connectdb()
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET","POST","PUT","PATCH","DELETE"],
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

      const dbInstance = await Connectdb();
      if (!dbInstance) return;

      const conversationsDb = dbInstance.collection("conversations");
      const messagesDb = dbInstance.collection("messages");

      const conversation = await conversationsDb.findOne({
        participants: { $all: [data.senderId, data.receiverId] }
      });

      if (conversation) {
        // Update existing conversation
        conversation.lastMessage = data.text;
        conversation.updatedAt = new Date();
        conversation.unreadCount[data.receiverId] = (conversation.unreadCount[data.receiverId] || 0) + 1;
        await conversationsDb.updateOne(
          { _id: new ObjectId(conversation._id) },
          { $set: conversation }
        );
        await messagesDb.insertOne({ ...msg, conversationId: conversation._id });
      } else {
        // Create new conversation
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
        await messagesDb.insertOne({ ...msg, conversationId: result.insertedId });
      }

      io.to(data.receiverId).emit("receive_message", data);
      io.emit("sussfully_send_message", msg);

    } catch (err) {
      console.error("Error sending message:", err.message);
    }
  });

  socket.on("mark_as_read", async (data) => {
    try {
      const dbInstance = await Connectdb();
      if (!dbInstance) return;

      const conversationsDb = dbInstance.collection("conversations");
      await conversationsDb.updateOne(
        { participants: { $all: [data.id, data.otherId] } },
        { $set: { [`unreadCount.${data.id}`]: 0 } }
      );
      socket.emit("succfuly_mark_as_read", data);

    } catch (err) {
      console.error("Error marking as read:", err.message);
    }
  });

  socket.on("both_message_mark", async (data) => {
    try {
      const dbInstance = await Connectdb();
      if (!dbInstance) return;

      const conversationsDb = dbInstance.collection("conversations");
      await conversationsDb.updateOne(
        { participants: { $all: [data.id, data.other_id] } },
        { $set: {
            [`unreadCount.${data.id}`]: 0,
            [`unreadCount.${data.other_id}`]: 0
          }
        }
      );

      io.to(data.id).emit("both_succfuly_mark_as_read", data);
      io.to(data.other_id).emit("both_succfuly_mark_as_read", data);

    } catch (err) {
      console.error("Error marking both messages:", err.message);
    }
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});


httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
