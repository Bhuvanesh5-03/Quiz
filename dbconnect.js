import {MongoClient} from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

export default async function connection(){
    try{
    const connect=new MongoClient(process.env.MONGO_URL);
    return await connect.connect();
    }catch(err){
        console.log("Cannot connect to the database");
        return null;
    }
}