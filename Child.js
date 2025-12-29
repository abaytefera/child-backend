import e from "express";
import { body,validationResult } from "express-validator";
import multer from "multer";
import { cache, Children } from "react";
import { UploadFile ,DeleteFile} from "./ClounderConfig.js";
import { Connectdb } from "./MongodbConfig.js";
import { ObjectId } from "mongodb";
export const routerChild=e.Router();
const upload = multer({ dest: 'uploads/' });
const uploadFields = upload.fields([
    { name: 'childPhotos', maxCount: 999 },
    { name: 'parentPhotos', maxCount: 999 }
]);
const uploadOtherFile=multer({dest:'otherFile/'})
const uploadOtherFiles=uploadOtherFile.fields([
  {name:"otherFile",maxCount:999}
])
const Uploadprofile=multer({dest:'profile/'});
const multerUploadProfile=Uploadprofile.single('uploadProfile')
 
routerChild.get('/',async(req,res)=>{
  let dbInstance=null
  try{

   dbInstance=await Connectdb();
   
   if(dbInstance){
     const childData=dbInstance.collection('Child');
     const childInfo=await childData.find({}).toArray();
 
     
     let female=0;
     let male=0;
     childInfo.forEach((dataChild)=>{

       if(dataChild.gender=='male'){
        ++male;
       }else if(dataChild.gender=='female'){

          ++female;

       } 
     })
    


     return res.status(200).json([{male:male,id:1},{female:female,id:2},{totalChild:female+male,id:3}]);
   





   }



  }catch(err){
    console.log(err.message)


  }



})

routerChild.post('/Create',uploadFields,async(req,res)=>{
let dbInstance=null;
let Parentfile=null
    const dataField = req.body
    const dataFileds=JSON.parse(dataField.Data);
     console.log(JSON.parse(dataField.Data));
     const ChildPhoto=req.files['childPhotos']
     const ParentPhoto=req.files['parentPhotos'];
     console.log(ChildPhoto)
        try{
    const Childfile=await  Promise.all(ChildPhoto.map(async(file)=>{
       
        const result=await UploadFile(file.path);
          return result;
     }))
   
    if(ParentPhoto){

Parentfile=await  Promise.all(ParentPhoto.map(async(file)=>{
       
        const result=await UploadFile(file.path);
          return result;
     }))

    }
      dbInstance=await Connectdb();

      if(dbInstance){
          
        const Chidldb=dbInstance.collection('Child');
       
       if(Parentfile){

       Chidldb.insertOne({...dataFileds,Childfile:Childfile,Parentfile:Parentfile});

    return res.status(201).json({msg:"succefuly Child and Parent Data store",ok:true});

        }else{
         Chidldb.insertOne({...dataFileds,Childfile:Childfile});
       return res.status(201).json({msg:"succefuly Child Data store",ok:true});
     }
      


      }







     }catch(error){

    return res.status(400).json({msg:error.message,ok:false})


  
     }

     






})

 routerChild.put('/Update',async(req,res)=>{
      const updateInfo=req.body
      const updateData=updateInfo.data;

      const id=updateInfo.id;
   
   
      console.log('start update');
      
   


      let dbInstance=null;
        try{

            dbInstance=await Connectdb();
         
        
         if(dbInstance){

               const ChildUpdate=await dbInstance.collection('Child');
               console.log("what happen");

                const result=await ChildUpdate.updateOne({_id:new ObjectId(id)},{$set:{...updateData}});
                console.log('succfully update')
                console.log(result);
             return res.status(200).json({msg:'succfully update',ok:true});
             






         }





        }catch(err){
          console.log('error happen');
          console.log(err.message);
       return res.status(400).json({msg:err.message,ok:false});


        }


 })

routerChild.get('/SearchByName',async(req,res)=>{

   const {search}=req.query
   let dbinstance=null

      try{
        dbinstance=await Connectdb();
        const query=search 
        ?{childFirstName:{$regex:search,
        $options:'i'
        }}:{}

        if(dbinstance){
          if(search.length>0){


       
          const Child=await dbinstance.collection('Child');
          const result=await Child.find(query).toArray();
          console.log("result")
      
          return res.status(200).json(result)
     }else{
      console.log('less zero')
      return res.status(200).json([])
     }





        }





      }catch(err){
         
          return res.status(400).json({msg:err.message});
  

      }




})

routerChild.get('/SearchById',async(req,res)=>{
         const {searchId}=req.query
         let dbInstance=null
         try{
            dbInstance=await Connectdb();
            if(dbInstance){
             const SingleChild=dbInstance.collection('Child');

               const  result=await SingleChild.findOne({_id:new ObjectId(searchId)});
               console.log("result single child");
              return res.status(200).json(result);

             }





         }catch(err){
        return res.status(400).json({msg:err.message,ok:false});

         }



})
routerChild.post('/OtherFileCreate',uploadOtherFiles,async(req,res)=>{
   const OtherData=req.body
   const Data=JSON.parse(OtherData.data);
   const id=Data.id;
   let data={title:Data.title,description:Data.description};
   const OtherFile=req.files['otherFile'];
   try{

   let dbinstance=null
  
    dbinstance=await Connectdb();
   let FileUrl=null
     if(dbinstance){

    if(OtherFile.length>0){
 FileUrl=await Promise.all(OtherFile.map(async(file)=>{

  const  result=await UploadFile(file.path);
  return result

}))
        

    }
    const Childdb= dbinstance.collection('Child');
    if(FileUrl){
   
      await Childdb.updateOne({_id:new ObjectId(id)},{$push:{otherChildData:{...data,_id:new ObjectId(),files:FileUrl,timeStamp:new Date()}}});

     return res.status(200).json({msg:"succfully store data",ok:true});

    }else{

await Childdb.updateOne({_id:new ObjectId(id)},{$push:{otherChildData:{...data,_id:new ObjectId(),timeStamp:new Date()}}});
  return res.status(200).json({msg:"succfully store data",ok:true});
    }



  
     





}
     






   }catch(err){

        console.log(err.message);
          return res.status(400).json({msg:err.message,ok:false});


   }






})
routerChild.delete('/delete-file',async(req,res)=>{
const {public_id,id,selectionType}=req.body

if(!public_id || !id  || !selectionType) {
  return res.status(400).json({msg:"public id not found or please login",ok:false});


}
try{
  console.log("Start delete");
  console.log('selection type');
  console.log(selectionType=='child');

const result=await DeleteFile(public_id);
console.log('result');


 if(result.ok){
  let dbInstance=null
  dbInstance=await Connectdb();
  if(!dbInstance){

    return res.status(400).json({msg:"database not connect",ok:false});

  } 
console.log("what is error");
  const childDb=await dbInstance.collection('Child');
  const childResult=await childDb.findOne({_id:new ObjectId(id)})
  console.log('childResult');
  console.log(childResult);
  if(!childResult){
  return res.status(400).json({msg:'child is not found',ok:false});

  }

  if(selectionType=='parent'){
    console.log('parent get it')
  const FileParent=childResult.Parentfile.filter((item)=>item.public_id!==public_id);
  await childDb.updateOne({_id:new ObjectId(id)},{$set:{Parentfile:FileParent}})

}else if(selectionType=='child'){
console.log('child get it');
    const FileChild=childResult.Childfile.filter((item)=>item.public_id!=public_id);
  await childDb.updateOne({_id:new ObjectId(id)},{$set:{Childfile:FileChild}})
}

return res.status(200).json(result);

 }




}catch(err){
  console.log('err');
  return res.status(400).json({mgs:err.message,ok:false});


}
 



})

routerChild.post('/UploadProfile',multerUploadProfile,async(req,res)=>{


 
    const {data}=req.body
    const file=req.file;
     let dbInstance=null
     const Data=JSON.parse(data)

     try{
    const result=await UploadFile(file.path);
     console.log('result');
      console.log(result);
    if(result.ok){
   

   dbInstance=await Connectdb();
   if(dbInstance){
       const  childDb=await  dbInstance.collection('Child');
    if(Data.type=='parent'){

    console.log('in parent')
   
      await childDb.updateOne({_id:new ObjectId(Data.id)},{$push:{Parentfile:result}});
      return res.status(200).json({msg:'succfully upload profile',ok:true});
     

}else if(Data.type='child'){


      await childDb.updateOne({_id:new ObjectId(Data.id)},{$push:{Childfile:result}});
      return res.status(200).json({msg:'succfully upload profile',ok:true});

}


   }


    }






  }catch(err){


  console.log(err.message);
  return res.status(400).json({msg:err.message,ok:false})

  }




})
