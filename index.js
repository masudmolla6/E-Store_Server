const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const categoriesCollections = client.db("E-Store").collection("categories");
    const reviewsCollections=client.db("E-Store").collection("reviews");


    // Products Related Api

  app.get("/categories", async(req,res)=>{
    const result=await categoriesCollections.find().toArray();
    res.send(result);
  })

  // app.get("/products", async (req, res) => {
  //   const search = req.query.search || "";
  //   const sort = req.query.sort || "";
  //   const page = parseInt(req.query.page) || 1;
  //   const limit = parseInt(req.query.limit) || 8;

  //   const query = search ? { name: { $regex: search, $options: "i" } } : {};

  //   // ✅ Sorting Logic
  //   let sortQuery = {};
  //   if (sort === "price-low") sortQuery = { price: 1 };
  //   if (sort === "price-high") sortQuery = { price: -1 };
  //   if (sort === "newest") sortQuery = { createdAt: -1 };

  //   const skip = (page - 1) * limit;

  //   const totalProducts = await productsCollections.countDocuments(query);
  //   const products = await productsCollections
  //     .find(query)
  //     .sort(sortQuery)
  //     .skip(skip)
  //     .limit(limit)
  //     .toArray();

  //   res.json({
  //     products,
  //     totalPages: Math.ceil(totalProducts / limit),
  //   });
  // });

  app.get("/products", async (req, res) => {
  try {
    const search = req.query.search || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const category = req.query.category || ""; // ✅ new

    let query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.category = category;
    }

    // ✅ Sorting logic
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
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


  app.get("/products/productDetails/:id", async(req, res)=>{
    const id=req.params.id;
    const query={_id:new ObjectId(id)};
    const result=await productsCollections.findOne(query);
    res.send(result);
  })



  // Reviews Related Api

  app.get("/reviews", async(req, res)=>{
    const result=await reviewsCollections.find().toArray();
    res.send(result);
  })



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
