import e from "express";
import { routerlogin } from "./authLogin.js";
import { routerEmployees } from "./Employee.js";
import cors from "cors";
import { routerChild } from "./Child.js";
import { Connectdb } from "./MongodbConfig.js";
import { UserRouter } from "./User.js";
import { Server } from "socket.io";
import { messageRouter } from "./message.js";
import {createServer} from "http"
import { socket } from "../src/out-of-The-ashe/Component/AuthenticateComponent/SocketIoConfig.js";
import { connected } from "process";
import { ObjectId } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();


 const onlineuser= new Map()
 const port=process.env.PORT
 const app=e();
 const httpserver=createServer(app);
 const io= new Server(httpserver,{
  cors:{
    origin:process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  }
 });
io.on('connection',(socket)=>{
 console.log('socket id '+ socket.id);
 socket.on('join',(user_id)=>{
    socket.join(user_id);
    onlineuser.set(user_id,socket.id);
    io.emit('onlineuser',Array.from(onlineuser.keys()));

 })
 socket.on('send_message',async(data)=>{

const msg={
senderId:data.senderId,
receiverId:data.receiverId,
text:data.text,
isRead:false,
createdAt:new Date()


}
console.log('message')
let dbinstance=null
dbinstance=await  Connectdb()
if(dbinstance){
  console.log('message start');
  const conversationsDb=await dbinstance.collection('conversations')
   const conversationsDbResult=await conversationsDb.findOne({participants:{$all:[data.senderId,data.receiverId]}});
    const messagedb=await dbinstance.collection('messages');
   if(conversationsDbResult){
    console.log('conversion found');
       conversationsDbResult.lastMessage=data.text
       conversationsDbResult.updatedAt=new Date()
       conversationsDbResult.unreadCount[data.receiverId]= (conversationsDbResult.unreadCount[data.receiverId] || 0)+1;
       await  conversationsDb.updateOne({_id:new ObjectId(conversationsDbResult._id)},{$set:conversationsDbResult})
       
        await messagedb.insertOne({...msg,conversationId:conversationsDbResult._id});
      io.to(data.receiverId).emit('receive_message',data);
      io.emit("sussfully_send_message",(msg));

   }else{
    console.log('conversion not found');
    const newConversion={
      participants: [data.senderId, data.receiverId],
      lastMessage:data.text,
      updatedAt: new Date(),
  
      unreadCount: {
        [data.senderId]:0 ,
        [data.receiverId]: 1
         }
        }
      const newConvesionResult=await  conversationsDb.insertOne(newConversion);
      await messagedb.insertOne({...msg,conversationId:newConvesionResult.insertedId})
      io.to(data.receiverId).emit('receive_message',data);
      io.emit("sussfully_send_message",(msg));
   }


}










 }),

socket.on('mark_as_read',async(data)=>{

try{
  let InstanceDb=null;
console.log('mark as red');
 InstanceDb=await Connectdb();
  if(InstanceDb){
      const conversionDb=await InstanceDb.collection('conversations');
      await conversionDb.updateOne({participants:{$all:[data.id,data.otherId]}},{$set:{[`unreadCount.${data.id}`]:0}});
console.log('update');
socket.emit('succfuly_mark_as_read',data)





  }






}catch(err){
console.log("error occure");
console.log(err.message)



}

})
socket.on('both_message_mark',async(data)=>{

try{
  let InstanceDb=null;
console.log('why not work')
 
 InstanceDb=await Connectdb();
  if(InstanceDb){
      const conversionDb=await InstanceDb.collection('conversations');
      await conversionDb.updateOne({participants:{$all:[data.id,data.other_id]}},{
        $set: {
          [`unreadCount.${data.id}`]: 0,
          [`unreadCount.${data.other_id}`]: 0
        }
      });

   io.to(data.id).emit('both_succfuly_mark_as_read', data);
    io.to(data.other_id).emit('both_succfuly_mark_as_read', data);





  }






}catch(err){
console.log("error occure");
console.log(err.message)



}


 })


 socket.on('disconnect',()=>{
 for (let [userId, socketId] of onlineuser) {
      if (socketId === socket.id) {
       onlineuser.delete(userId);
        break;
      }
    }
  
 })


})

app.use(cors());
app.use(e.json());
app.use(e.urlencoded({extended:true})); 
app.use('/login',routerlogin);
app.use('/Employees', routerEmployees)
app.use('/Child',routerChild);
app.use('/User',UserRouter);
app.use('/message',messageRouter);



httpserver.listen(port,()=>{
    console.log(`http://localhost:${port}`);
})
