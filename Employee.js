import e from "express";

import { body,validationResult } from "express-validator";
import bcrypt from 'bcrypt'
import { Connectdb,Closedb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";

export const routerEmployees=e.Router();
   
const EmployeesValidation=[
         body('firstName')
              .notEmpty().withMessage("please enter first name")
              .escape()
              .trim(),
         body('lastName')
            .notEmpty().withMessage("please enter last name")
            .escape()
            .trim(),
         body('email')
            .notEmpty().withMessage("please enter email")
            .isEmail().withMessage("please enter Invalid email format")
            .normalizeEmail()
            .escape()
            .trim(),
         body('phone')
            .notEmpty().withMessage("please enter phone")
            .escape()
            .trim(),
             body('password')
            .notEmpty().withMessage("please enter Password")
            .isLength({min:8}).withMessage('Password must be at least 8 characters')
            .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
            .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
            .matches(/[0-7]/).withMessage("Password must contain a number")
            .matches(/[@$!%*?&+#-=]/).withMessage('Password must contain a special character')
            .escape()
            .trim(),
            body('role')
            .notEmpty().withMessage("please select employe Role")
            .escape()
            .trim(),
            body('educationBackground')
            .notEmpty().withMessage("please select Education Background")
            .escape()
            .trim(),




   ]

  routerEmployees.get('/',async(req,res)=>{
    let dbInstance=null
    console.log('employee');
     try{
       dbInstance=await Connectdb();

       if(dbInstance){
         const EmployeeData=dbInstance.collection('User')
         const Empdata=await EmployeeData.find({}).toArray();
    
   
         return res.status(200).json(Empdata)
    
       }




 
     }catch(err){
      console.log(err.message);


     }




  })


  routerEmployees.get('/getById',async(req,res)=>{
    const {id}=req.query;

  
    try{
      let dbinstance=null;
         dbinstance=await Connectdb();
         console.log('id ')
         console.log(id);

       if(dbinstance){
          const userDB= await dbinstance.collection('User');

          const UserResult=await userDB.findOne({_id:new ObjectId(id)});
      

          return res.status(200).json(UserResult);

         

 


      }





    }catch(err){
     console.log("err");
     console.log(err.message)
      return res.status(400).json({msg:err.message,ok:false});
    }

  })


routerEmployees.post('/Create',EmployeesValidation,async(req,res)=>{
        const {firstName,lastName,password,email,phone,role,educationBackground}=req.body;
       const error=validationResult(req);
       console.log("password");
       console.log(password);
   let dbInstance=null;
       if(!error.isEmpty()){
         console.log(error);
        return res.status(400).json({msg:error.msg ||error.errors[0].msg,ok:false});
       }
    
           console.log("user wow");
       try{
         console.log("user ínside");
           dbInstance=await Connectdb();

           if(dbInstance){
            console.log("user start");
            const UserAuthCheck=await dbInstance.collection('userAuth');
       
            const userAuth=await UserAuthCheck.findOne({email});
             console.log("check valid email");
           
            if(userAuth){
           throw new Error("email already register");
            }
            
             const User=dbInstance.collection('User');
             const hashsalt=10;
             const hasedPassword=await bcrypt.hash(password, hashsalt);
       
             const EmployeInsert= await User.insertOne({firstName:firstName,lastName:lastName,email:email,phone:phone,role:role,educationBackground:educationBackground,profile:'undraw_young-man-avatar_wgbd.svg'});
             if(EmployeInsert.insertedId){
              const EmployeAuthInsert=dbInstance.collection('userAuth');
              const  Employeauth=await EmployeAuthInsert.insertOne({email:email,user_id:EmployeInsert.insertedId,password: hasedPassword});
                if(Employeauth.insertedId){
                  return res.status(201).json({msg:"succfuly account create",ok:true});

                }
             }
            
         
                

           }


       }catch(error){
     
            
             return res.status(500).json({msg:error.message,ok:false});

       }finally{
           



       }






})