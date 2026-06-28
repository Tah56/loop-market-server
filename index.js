const express = require("express");
const app = express();
const port = 5000;
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.get("/", (req, res) => {
  res.send("Hello World!");
});

const logger = async (req, res, next) => {
  console.log("logger log", req.params);
  next();
};

const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    await client.connect();

    const database = client.db("loopMarket");
    const productsCollection = database.collection("products");
    const users = database.collection("user");
    const paymentsCollection = database.collection("payments");
    const ordersCollection = database.collection("orders");
    const sessionCollection = database.collection("session");

    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "unauthorized acces" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "unauthorized acces" });
      }

      const query = { token: token };

      const session = await sessionCollection.findOne(query);
      
      const userId = session.userId;
      
      const userQuery = { _id: userId };
      const user = await users.findOne(userQuery);
      console.log(user);
req.user= user;
      next();
    };


const verifyBuyer = async(req,res,next)=>{
  if(req.user?.role !=="buyer"){
    return res .status(403).send({message:"forbidden access"})
  }
  next()
}


const verifyAdmin = async(req,res,next)  =>{
  if(req.user?.role !=="admin"){
    return res.status(403).send({message:"forbidden access"})
  }
  next()
}

const verifySeller = async(req,res,next)  =>{
  if(req.user?.role !=="seller"){
    return res.status(403).send({message:"forbidden access"})
  }
  next()
}

    app.get("/api/users", verifyToken, async (req, res) => {
      const result = await users.find().toArray();
      res.send(result);
    });

    app.patch("/api/users/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const result = await users.updateOne({ email: id }, { $set: data });

      res.send(result);
    });

    app.get("/api/users/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await users.findOne({ email: id });
      res.send(result);
    });

    app.post("/api/payments", verifyToken, async (req, res) => {
      const payments = req.body;
      const result = await paymentsCollection.insertOne(payments);
      const rest = await ordersCollection.updateOne(
        { orderId: payments.orderId },
        { $set: { paymentStatus: payments.paymentStatus } },
      );
      res.send({ result, rest });
    });

    app.delete("/api/payments/:id", async (req, res) => {
      const { id } = req.params;
      const result = ordersCollection.deleteOne({
        orderId: id,
      });
      res.send(result);
    });

    app.post("/api/products",verifyToken,verifySeller, async (req, res) => {
      const products = req.body;
      const result = await productsCollection.insertOne(products);
      res.send(result);
    });

    app.get("/api/products", async (req, res) => {
      console.log("sss", req.query);
      const query = {};
      if (req.query.category) {
        query.category = req.query.category;
      }
      if (req.query.condition) {
        query.condition = req.query.condition;
      }
      if (req.query.search) {
        query.$or = [{ title: { $regex: req.query.search, $options: "i" } }];
      }
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/api/sellers",verifyToken, async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });
    app.get("/api/users/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await users.findOne({
        email: id,
      });
      res.send(result);
    });
    app.patch("/api/users/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { image } = req.body;
      const result = await users.updateOne(
        {
          email: id,
        },
        {
          $set: { image: image },
        },
      );
      res.send(result);
    });
    app.get("/api/seller/:id",verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await ordersCollection
        .find({
          sellerEmail: id,
        })
        .toArray();
      res.send(result);
    });
    app.patch("/api/seller/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { orderStatus } = req.body;

      const result = await ordersCollection.updateOne(
        {
          orderId: id,
        },
        { $set: { orderStatus: orderStatus } },
      );

      res.send(result);
    });

    app.get("/api/products/:id", async (req, res) => {
      const { id } = req.params;

      const result = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/api/overview",verifyToken,verifySeller, async (req, res) => {
      const query = {};

      if (req.query.email) {
        query.email = req.query.email;
      }

      const totalOrders = await ordersCollection.countDocuments({
        "buyerInfo.email": query.email,
      });

      const active = await ordersCollection.countDocuments({
        "buyerInfo.email": query.email,
        orderStatus: { $ne: "Delivered" },
      });

      const payments = await paymentsCollection
        .find({
          buyerEmail: query.email,
          paymentStatus: "Paid",
        })
        .toArray();

      const totalSpent = payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );

      res.send({
        totalOrders,
        totalSpent,
        active,
      });
    });

    app.get("/api/myproduct/:id", async (req, res) => {
      const { id } = req.params;
      const result = await productsCollection
        .find({
          "seller.id": id,
        })
        .toArray();
      res.send(result);
    });

    app.patch("/api/products/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      console.log(data);
      if (data.stauts === "Approved") {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: data.status } },
        );
      } else if (data.status === "Rejected") {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: data.status } },
        );
      }
      if (data.status === "block") {
        const q = await users.updateOne(
          {
            _id: new ObjectId(id),
          },
          { $set: { status: data.status } },
        );
        const r = await productsCollection.updateMany(
          {
            "seller.id": id,
          },
          { $set: { status: "Rejected" } },
        );
        const result = { r, q };
        console.log(result);

        res.send({ r, q });
        return;
      } else if (data.status === "active") {
        const result = await users.updateOne(
          {
            _id: new ObjectId(id),
          },
          { $set: { status: data.status } },
        );

        const r = await productsCollection.updateMany(
          {
            "seller.id": id,
          },
          { $set: { status: "Approved" } },
        );
        res.send({ result, r });
        return;
      }

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );
      res.send(result);
    });

    app.get("/api/orders/:buyerEmail", verifyToken, verifyBuyer, async (req, res) => {
      const { buyerEmail } = req.params;

      if(req.params){
        req.params.email === buyerEmail
      console.log('something');

      if(req.user.email !== buyerEmail){
        return res.status(403).send({message:"forbidden access"})
      }
      
      }

      

      const result = await ordersCollection.find({
          "buyerInfo.email": buyerEmail,
        })
        .toArray();


      
      res.send(result);
    });
    app.post("/api/orders", verifyToken, async (req, res) => {
      const data = req.body;
      const orders = {
        ...data,
        createdAt: new Date(),
      };
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });

    app.delete("/api/products/:id",verifyToken,verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
