require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ezlz7xu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const db = client.db("parcelDB"); // or any DB name you want
    const parcelCollection = db.collection("parcels");

    // GET API to fetch all parcels
    app.get("/parcels", async (req, res) => {
      const parcels = await parcelCollection.find().toArray();
      res.send(parcels);
    });

    // GET parcel by ID
    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const parcel = await parcelCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!parcel) {
          return res
            .status(404)
            .send({ success: false, message: "Parcel not found" });
        }

        res.send({ success: true, data: parcel });
      } catch (error) {
        console.error("Error fetching parcel by ID:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch parcel" });
      }
    });

    // POST API to add a new parcel
    app.post("/parcels", async (req, res) => {
      try {
        const parcelData = req.body;
        const result = await parcelCollection.insertOne(parcelData);
        res.status(201).send({
          success: true,
          message: "Parcel created successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error adding parcel:", error);
        res.status(500).send({
          success: false,
          message: "Failed to create parcel",
        });
      }
    });

    // GET parcels by user email, sorted by latest creation_date first
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email; // Get email from query params

        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        const parcels = await parcelCollection
          .find({ createdBy: email })
          .sort({ creation_date: -1 }) // descending order (latest first)
          .toArray();

        res.send({ success: true, data: parcels });
      } catch (error) {
        console.error("Error fetching parcels:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch parcels" });
      }
    });

    const { ObjectId } = require("mongodb");

    // DELETE parcel by ID
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await parcelCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.error("Error deleting parcel:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete parcel" });
      }
    });

    // POST /create-payment-intent
    app.post("/create-payment-intent", async (req, res) => {
      const amount = req.body.amount;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // amount in paisa (smallest currency unit)
          currency: "bdt",
          payment_method_types: ["card"],
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    console.log("✅ Connected to MongoDB and ready to handle requests");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Parcel website server is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
