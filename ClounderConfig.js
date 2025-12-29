import { v2 as cloudinary } from 'cloudinary';


    // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRET
    });



export async function UploadFile(filepath){

    try{

         const uploadResult = await cloudinary.uploader.upload(filepath,{
            resource_type:'auto'
         });

         
         return  {mediaurl:uploadResult.secure_url,
          public_id:uploadResult.public_id,
          resource_type:uploadResult.resource_type,
          format:uploadResult.format,
          mimeType:uploadResult.mimeType,
          ok:true
  }

    }catch(error){

          console.log("Failed to upload media.");
          throw new Error(error.message);


    }
      




}

    
  export async function DeleteFile(public_id){

try{

    const result=await cloudinary.uploader.destroy(public_id);
    return {msg:"succfuly delete file",result:result,ok:true,public_id}



}catch(err){

 throw new Error(err.message);


}




  }  