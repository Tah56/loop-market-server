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

    app.post("/api/products", async (req, res) => {
      const products = req.body;
      const result = await productsCollection.insertOne(products);
      res.send(result);
    });

    app.get("/api/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/products/:id", async (req, res) => {
      const { id } = req.params;

      const result = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
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

    app.patch("/api/products/:id", async (req, res) => {
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
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );
      res.send(result);
    });

    app.delete("/api/products/:id", async (req, res) => {
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
