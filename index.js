const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const jwt=require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
    const userCollections=client.db("E-Store").collection("users");
    const cartsCollections=client.db("E-Store").collection("carts");
    const paymentCollections = client.db("E-Store").collection("payments");
    const orderCollections = client.db("E-Store").collection("orders");
    const wishlistCollections = client.db("E-Store").collection("wishlist");


    // Middleware
    const verifyToken=async(req, res, next)=>{
      // console.log(req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token=req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
        if(error){
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded=decoded;
        next();
      })
    }

    const verifyAdmin=async(req, res, next)=>{
      const email=req.decoded.email;
      const query={email:email};
      const user= await userCollections.findOne(query);
      if(!user){
        return res.status(401).send({ message: "unauthorized access" });
      }
      const isAdmin=user?.role==="admin";
      if(!isAdmin){
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    }


    // jwt related api
    app.post("/jwt", async(req, res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn:"1h"
      })
      res.send({token});
    })

    // User Relative Api
    app.get("/users",verifyToken,verifyAdmin, async(req, res)=>{
      const result=await userCollections.find().toArray();
      res.send(result);
    })

    app.get("/users/admin/:email",verifyToken, async(req, res)=>{
      const email=req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query={email:email};
      const user=await userCollections.findOne(query);
      let admin=false;
      if(user){
        admin=user?.role ==="admin";
      }
      res.send(admin);
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollections.findOne(query);
      if (existingUser) {
        return res.send({
          message: "User already Exist in the database",
          insertedId: null,
        });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    });

    app.patch("/users/admin/:id", async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const makeAdmin={
        $set:{
          role:"admin"
        },
      };
      const result=await userCollections.updateOne(query, makeAdmin);
      res.send(result);
    })

    app.delete("/users/:id",verifyToken,verifyAdmin, async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await userCollections.deleteOne(query);
      res.send(result);
    });

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


    app.delete("/products/:id",verifyToken, async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await productsCollections.deleteOne(query);
      res.send(result);
    })


    app.patch("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        // console.log("product Id", id);
        // console.log(updatedData);

        const query = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: updatedData,
        };

        const result = await productsCollections.updateOne(query, updateDoc);

        res.send(result);
      } catch (error) {
        // console.error("PATCH ERROR:", error);
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    // Payment Related api

    app.get("/payments", async(req, res)=>{
      const email=req.query.email;
      const query={email:email};
      const result=await paymentCollections.find(query).toArray();
      res.send(result);
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      console.log(price);
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async(req, res)=>{
      const payment=req.body;
      const paymentsResults=await paymentCollections.insertOne(payment);

      // Carefully:Delete Each Item in the Database.
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      }
      const deleteCartResult = await cartsCollections.deleteMany(query);

      res.send({paymentsResults,deleteCartResult});

    })

    


    // Reviews Related Api

    app.get("/reviews", async(req, res)=>{
      const result=await reviewsCollections.find().toArray();
      res.send(result);
    })


    // carts related api
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;

      // Optional: Check if the item already exists for this user
      const existing = await cartsCollections.findOne({
        email: cartItem.email,
        productId: cartItem.productId
      });

      if (existing) {
        return res.send({ message: "Item already in cart" });
      }

      const result = await cartsCollections.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id",verifyToken, async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await cartsCollections.deleteOne(query);
      res.send(result);
    })

    // app.delete("/carts/:id",verifyToken, async(req, res)=>{
    //   const id=req.params.id;
    //   const query={_id:new ObjectId(id)};
    //   const result=await cartsCollections.deleteOne(query);
    //   res.send(result);
    // })


    app.get("/carts",verifyToken, async(req, res)=>{
      const email=req.query.email;
      // console.log("inside verify token",req.headers.authorization);
      const query={email:email};
      const result=await cartsCollections.find(query).toArray();
      res.send(result);
    })


  // Wishlist Related Api
    app.post("/wishlist", async (req, res) => {
      const wishlistItem = req.body;

      // Optional: Check if the item already exists for this user
      const existing = await wishlistCollections.findOne({
        email: wishlistItem.email,
        productId: wishlistItem.productId
      });

      if (existing) {
        return res.send({ message: "Item already in Wishlist" });
      }

      const result = await wishlistCollections.insertOne(wishlistItem);
      res.send(result);
    });

    app.get("/wishlist",verifyToken, async(req, res)=>{
      const email=req.query.email;
      // console.log("inside verify token",req.headers.authorization);
      const query={email:email};
      const result=await wishlistCollections.find(query).toArray();
      res.send(result);
    })

    app.delete("/wishlist/:id",verifyToken, async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await wishlistCollections.deleteOne(query);
      res.send(result);
    })



    // Orders Related Api
    app.get("/admin/orders",verifyToken,verifyAdmin, async(req, res)=>{
      const result=await orderCollections.find().toArray();
      res.send(result);
    })

    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;

      // 🔐 security check (MOST IMPORTANT)
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const query = { "userInfo.email": email };
      const result = await orderCollections.find(query).toArray();
      res.send(result);
    });


    app.get("/orders/:id", async(req, res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await orderCollections.findOne(query);
      res.send(result);
    })

    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;

        // 1. Basic validation
        if (!order?.items || order.items.length === 0) {
          return res.status(400).send({ message: "Order items missing!" });
        }

        if (!order?.userInfo?.email) {
          return res.status(400).send({ message: "User email required!" });
        }

        if (!order?.paymentInfo?.transactionId) {
          return res.status(400).send({ message: "Payment info missing!" });
        }

        // 2. Default fields
        order.status = order.status || "pending";
        order.createdAt = new Date();

        // 3. Insert into DB
        const result = await orderCollections.insertOne(order);

        res.send({
          success: true,
          message: "Order placed successfully!",
          orderId: result.insertedId,
        });

      } catch (error) {
        console.log("Order API Error:", error);
        res.status(500).send({ message: "Server error while placing order." });
      }
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
