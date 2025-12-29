import e from "express";
import bcrypt from "bcrypt"
export const user=e.Router();
import { Connectdb, Closedb } from "./MongodbConfig.js";
let  dbInstance=null;
user.post('/creates',async(req,res)=>{
     const {email,password,name}=req.body;
     console.log(email);
     console.log(password);
      try{
        const saltHash=10;
       dbInstance=await Connectdb();

        if(dbInstance){
             const User=dbInstance.collection('User');
             const hasedPssword= await bcrypt.hash(password,saltHash);
             const Userresult=await  User.insertOne({name,email});
              console.log("data");
              console.log( Userresult);
             if(Userresult.insertedId){
               const  authLogin=dbInstance.collection('userAuth');

              const  authresult=await authLogin.insertOne({email,user_id:Userresult.insertedId,password:hasedPssword});
              console.log("second Data");
              console.log(authresult);
                if(authresult.insertedId){
                  return   res.status(200).json({msg:"user succfuly create",ok:true});
                }
             }



        }
        




          }catch(error){

            return res.status(500).json({msg:error.message,ok:false});
          }finally{
          Closedb();
          
                  }




})




