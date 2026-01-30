const express=require("express")
const app=express()
const port=3100
const morgan=require("morgan")
app.use(morgan("combined"))
//create default API
app.get("/",(req,res)=>{
    res.send("Xin chào quý khách!")
})
app.listen(port,()=>{
    console.log(`My server is starting at port = ${port}`)
})
    
const cors=require("cors")
app.use(cors())

app.get("/books",(req,res)=>{
    res.send(database)
})