const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;


// middlewares
app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6ygkpv0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const productsCollections = client.db("E-Store").collection("products");

    // app.get("/products", async(req, res)=>{
    //   const result=await productsCollections.find().toArray();
    //   res.send(result);
    // })
app.get("/api/products", async (req, res) => {
  const search = req.query.search || "";
  const sort = req.query.sort || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;

  const query = search ? { name: { $regex: search, $options: "i" } } : {};

  // ✅ Sorting Logic
  let sortQuery = {};
  if (sort === "price-low") sortQuery = { price: 1 };
  if (sort === "price-high") sortQuery = { price: -1 };
  if (sort === "newest") sortQuery = { createdAt: -1 };

  const skip = (page - 1) * limit;

  const totalProducts = await productsCollections.countDocuments(query);
  const products = await productsCollections
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .toArray();

  res.json({
    products,
    totalPages: Math.ceil(totalProducts / limit),
  });
});



    await client.connect();    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", async(req, res)=>{
    res.send("E-store Server is running.")
})

app.listen(port, ()=>{
    console.log("E-Store Server is running from port", port);
})
