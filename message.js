import e from "express";
import { Connectdb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";

export const messageRouter=e.Router();

messageRouter.get('/getMessageById',async(req,res)=>{
  const {id,myId}=req.query;
 ;
   
  try{
    console.log('in message backend');
    let dbInstance=null;
    dbInstance=await Connectdb();
    if(dbInstance){

      const conversionsDb=await dbInstance.collection('conversations')
       const resultConversations=await conversionsDb.findOne({participants:{$all:[id,myId]}})
  
      
       if(resultConversations){
      ;
          const messagedb=await dbInstance.collection('messages');
          const resultMessage=await messagedb.find({conversationId:resultConversations._id}).toArray();
       

          return res.status(200).json(resultMessage);


        
        

       }
       console.log("it occure")
              return res.status(200).json([]);



    }





  }catch(err){

    console.log(err.message);

  }



})
messageRouter.get('/getConversionById',async(req,res)=>{

    const {id}=req.query;
    try{
    let dbInstance=null;
     dbInstance=await Connectdb();
     if(dbInstance){
         const conversionDb=dbInstance.collection('conversations');
          const conversionResult=await conversionDb.find({participants:id}).toArray();
  const db=dbInstance.collection('User');
      const lastConversionResult=await Promise.all((conversionResult ??[]).map(async(conv)=>{

              const userId=await conv.participants.find((user_id)=>user_id!==id);

                  
                  
                  const otherUserData=await db.findOne({_id:new ObjectId(userId)});
       
                
    


                  

            
            return {...conv,otherUserData}



        }))
        return res.status(200).json(lastConversionResult);


 


    }






    }catch(err){

        console.log(err.message);
        
    }



})

messageRouter.get('/getUnreadMessage',async(req,res)=>{
  const {id}=req.query;
  try{
    let dbinstance=null
    dbinstance=  await Connectdb();
    if(dbinstance){
      const conversionDb=await dbinstance.collection('conversations');
     const  conversionResult=await conversionDb.find({participants:{$in:[id]}}).toArray();
   
let unread=0
await conversionResult.forEach((item)=>{
if(item.unreadCount?.[id]>0){
  unread++;
}

})

return res.status(200).json(unread);









    }








  }catch(err){

    console.log(err.message);
  }







})