import jwt from 'jsonwebtoken'
const VerifyToken=(req,res,next)=>{
  let authToken=req.headers.authorization;

  if(!authToken || authToken.startsWith('Bearer')){
      
     return res.status(403).json({msg:"Access Denied",ok:false});
  };
  try{
        const secret_key='abu4858@gmail.com';
    const token=authToken.split('')[0];
    const verfiy=jwt.verify(token, secret_key);
    next();


  }catch(error){

    return res.status(403).json({msg:"Access Denied",ok:false});
  }





}