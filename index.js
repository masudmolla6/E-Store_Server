const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;


// middlewares
app.use(express.json());
app.use(cors());

app.get("/", async(req, res)=>{
    res.send("E-store Server is running.")
})

app.listen(port, ()=>{
    console.log("E-Store Server is running from port", port);
})
