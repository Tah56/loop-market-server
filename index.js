const express = require('express');
const app = express()
const port = 5000
const cors = require("cors")
require('dotenv').config()


app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
app.get('/', (req, res) => {
  res.send('Hello World!')
})


const uri = process.env.DB_URI


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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);