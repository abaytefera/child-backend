import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();
const url=process.env.MONGO_URI

const client=new MongoClient(url);
let dbInstance=null;
export async function Connectdb(db) {

     if(dbInstance){
         return dbInstance;
       }
        
   try{
        dbInstance= client.db('out-of-the-ashe-db');
        
         return dbInstance;

       }catch(error){
     
        await client.close();
 

       }
    
}
export function Closedb(){
     dbInstance=null;
    client.close();

}