import e from "express";
import { Connectdb ,Closedb} from "./MongodbConfig.js";
import bcrypt from "bcrypt"
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken"
import rateLimit from "express-rate-limit"





export const routerlogin=e.Router();
const loginValidationRule=[
body('email')
.notEmpty().withMessage("please enter you email")
.isEmail().withMessage("please enter Invalid email format")
.normalizeEmail()
.escape()
.trim(),
body('password')
.notEmpty().withMessage('please enter password')
.escape()
.trim()



]
let dbinstance=null
const loginlimiter=rateLimit({
    windowMs:1*60*1000,
    max:5,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        console.log(`Rate limit exceeded for IP: ${req.ip}`);
        return res.status(429).json({
            ok:false,
            msg:"Too many login attempts. Account temporarily locked due to suspicious activity. Try again later"
        })
    }
})

routerlogin.post('/',loginValidationRule,loginlimiter,async(req,res)=>{
 const {email,password}=req.body;
 const error=validationResult(req);
 console.log(password)
 console.log(email)

if(!error.isEmpty()){

    return res.status(400).json({msg:error.array(),ok:false})
}
     try{
        
     
          dbinstance=await Connectdb();
          console.log("db instance");
          
         if(dbinstance){
            const UserAuthCheck=await dbinstance.collection('userAuth');
       
            const userAuth=await UserAuthCheck.findOne({email});
           
          
        if(userAuth){

            
        
            const hashpassword=userAuth.password;
            const match=await bcrypt.compare(password,hashpassword);
            if(match){
                        const userDB=await dbinstance.collection('User');
                        const UserData=await userDB.findOne({_id:userAuth.user_id});
                        const secret_key='abu4858@gmail.com';
                       const tokenOPtion={
                                 algorithm:'HS256',
                                 expiresIn:'30day'
                           
                       }
                    
                        const userDataPayload={
                           sub:userAuth,
                           role:UserData.role,
                           email:userDB.email
                               }
                      const token=jwt.sign(
                        userDataPayload,
                        secret_key,
                        tokenOPtion
                        

                      )

                      console.log("id");
      console.log(userAuth.user_id);

                    return res.status(200).json({
                      msg:" succfuly login redirect"  ,
                      token,
                      id:userAuth.user_id,
                      ok:true

                    })

               }
               else{
                   return res.status(401).json({msg:"incorrect password",ok:false});
               }
            }else{
                return res.status(400).json({msg:"email not found",ok:false});
            }

        }}

     catch(error){

            return res.status(500).json({msg:error.message,ok:false});
        }finally{
    dbinstance=null;
       Closedb;


            
        }

 
         }
            
              






)
