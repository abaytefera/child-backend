import e from "express";
import { Connectdb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";
import { routerChild } from "./Child.js";

import {body, validationResult } from "express-validator";
import bcrypt from 'bcrypt'
import { UploadFile } from "./ClounderConfig.js";
import multer from "multer";
export const UserRouter=e.Router();



const uploadProfile = multer({dest:'/uploadProfile'});
const uploadProfileUser=uploadProfile.fields([
{  name:'profile',maxCount:1}
])

 const PasswordValidation=[
       body('newpassword')
            .notEmpty().withMessage("please enter Password")
            .isLength({min:8}).withMessage('Password must be at least 8 characters')
            .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
            .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
            .matches(/[0-7]/).withMessage("Password must contain a number")
            .matches(/[@$!%*?&+#-=]/).withMessage('Password must contain a special character')
            .escape()
            .trim()

 ]


UserRouter.get('/',async(req,res)=>{
const {_id}=req.query;
console.log(_id);
let dbinstance=null
console.log("reach");
  try{
    dbinstance=await Connectdb()
    if(dbinstance){
     const Userdb=dbinstance.collection('User');
     const user=await Userdb.findOne({_id:new ObjectId(_id)});
  
       console.log("abu")


 return res.status(200).json(user);
     


    }






  }catch(err){


    console.log(err);


  }


})



UserRouter.put('/Update',async(req,res)=>{

  try{
      let dbinstance=null
       const userData=req.body;
       const id=userData._id;

       console.log(userData._id);

       const Data=Object.fromEntries(Object.entries(userData).filter(([key,value])=>key !=='_id'));

        dbinstance=await Connectdb();
        if(dbinstance){
       const UserData=dbinstance.collection('User');

       const result=await UserData.updateOne({_id:new ObjectId(id)},{$set:{...Data}});
         console.log(result);
         return res.status(200).json({msg:'succfully update',ok:false});





        }
  

}catch(err){



  return res.status(400).json({msg:err.message,ok:false});
}



})

UserRouter.put('/Password',PasswordValidation,async(req,res)=>{
try{
     let resultValidation=validationResult(req)
     if(!resultValidation.isEmpty()){
      
         throw new Error(resultValidation.msg);
        return
       }
      const collectionPassword=req.body;
       const hashsalt=10;
      console.log('password change');
      console.log(collectionPassword);
      let dbinstance=null;
      dbinstance=await Connectdb()
      if(dbinstance){
      const userAuthdb= await  dbinstance.collection('userAuth');
    const userAuth=await userAuthdb.findOne({user_id:new ObjectId(collectionPassword.id)});
  
    const match=await bcrypt.compare(collectionPassword.oldPassword,userAuth.password);
    console.log(match);
    if(!match){

  throw new Error("password incorrect");
return
    }
    if(collectionPassword.newpassword!=collectionPassword.confirmPassword){

    throw new Error("password is must be same new and confirm  password not same");
return

    }
    console.log('passwor mathh succfuly')
   
const hashPassword=await bcrypt.hash(collectionPassword.newpassword,hashsalt);


   const updatePassword= await userAuthdb.updateOne({user_id:new ObjectId(collectionPassword.id)},{$set:{password:hashPassword}});
     console.log(updatePassword);
     return res.status(200).json({msg:'password succfuly update',ok:false});

   const {id}=req.body
 

if(req.file){


         const result= await UploadFile(req.file.path)
         if(result.ok){



         }



}



      }







}catch(err){
  console.log('err');
console.log(err.message);



}





})

UserRouter.patch('/updateUserProfile',uploadProfileUser,async(req,res)=>{
  const {id}=req.body;
  console.log('id');
  console.log(id);
  console.log(req.files['profile'][0]);
  console.log('file');
  try{

   const result= await UploadFile(req.files['profile'][0].path)
   console.log(result);
if(result.ok){

  let dbInstance=null;
  dbInstance=await Connectdb();
  if(dbInstance){

       const userDb=await dbInstance.collection('User');
    await userDb.updateOne({_id:new ObjectId(id)},{$set:{profile:result}});
    console.log("update")
    return res.status(200).json({msg:"succfuly update user profil",ok:true})

  }

}

  }catch(err){
console.log(err.message);
 res.status(400).json({msg:err.message,ok:false})
  }


})