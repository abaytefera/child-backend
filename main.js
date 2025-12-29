
import e from "express"
const app=e();
app.get('/',(req,res)=>{

res.json({msg:"home page"});

})
const port=2020;
app.listen(port,()=>{
    console.log(`http://localhost:${port}`)
})