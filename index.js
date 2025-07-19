require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require("./firebase_admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
    await client.connect();

    const db = client.db("parcelDB");
    const usersCollection = db.collection("users");
    const parcelCollection = db.collection("parcels");
    const paymentCollection = db.collection("payments");
    const ridersCollection = db.collection("riders");

    // custom middlewares
    const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res
          .status(401)
          .send({ success: false, message: "Unauthorized" });
      }
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .send({ success: false, message: "Unauthorized" });
      }
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        console.error(error);
        return res
          .status(401)
          .send({ success: false, message: "Unauthorized" });
      }
    };

    // admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const user = await usersCollection.findOne({ email: email });
      if (user?.role !== "admin") {
        return res.status(403).send({ success: false, message: "Forbidden" });
      }
      next();
    };

    // GET: All users
    app.get("/users/search", verifyFBToken, verifyAdmin, async (req, res) => {
      const emailQuery = req.query.email;

      if (!emailQuery)
        return res.status(400).send({ error: "Email query is required" });

      try {
        const users = await usersCollection
          .find({
            email: { $regex: emailQuery, $options: "i" }, // case-insensitive
          })
          .project({ email: 1, createdAt: 1, role: 1 }) // only necessary fields
          .limit(10)
          .toArray();

        res.send(users);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // GET: User role
    app.get("/users/:email/role", async (req, res) => {
      const { email } = req.params;

      try {
        const user = await usersCollection.findOne(
          { email },
          { projection: { role: 1 } }
        );

        if (!user) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        res.send({ success: true, role: user.role || "user" });
      } catch (error) {
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    // PATCH: User role
    app.patch(
      "/users/:email/role",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const { email } = req.params;
        const { role } = req.body;
        try {
          const result = await usersCollection.updateOne(
            { email },
            { $set: { role } }
          );
          res.send({ success: true, modifiedCount: result.modifiedCount });
        } catch (error) {
          res
            .status(500)
            .send({ success: false, error: "Failed to update role" });
        }
      }
    );

    // POST: User
    app.post("/users", async (req, res) => {
      const email = req.body.email;
      const user = req.body;

      const updateDoc = {
        $setOnInsert: {
          name: user.name,
          photoURL: user.photoURL,
          role: user.role,
          created_at: user.created_at,
        },
        $set: {
          last_login: user.last_login,
        },
      };

      const result = await usersCollection.updateOne(
        { email: email },
        updateDoc,
        { upsert: true }
      );

      res.send(result);
    });

    // GET: All parcels OR parcels by user (created_by), sorted by latest
    app.get("/parcels", verifyFBToken, async (req, res) => {
      try {
        const { email, payment_status, delivery_status } = req.query;
        let query = {};
        if (email) {
          query = { created_by: email };
        }

        if (payment_status) {
          query.payment_status = payment_status;
        }

        if (delivery_status) {
          query.delivery_status = delivery_status;
        }

        const options = {
          sort: { createdAt: -1 }, // Newest first
        };
        const parcels = await parcelCollection.find(query, options).toArray();
        res.send(parcels);
      } catch (error) {
        console.error("Error fetching parcels:", error);
        res.status(500).send({ message: "Failed to get parcels" });
      }
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

    // GET /payments?email=someone@example.com
    app.get("/payments", verifyFBToken, async (req, res) => {
      try {
        const email = req.query.email;

        console.log("Decoded token:", req.user);
        if (req.user.email !== email)
          return res.status(403).send({
            success: false,
            message: "Unauthorized",
          });

        const filter = email ? { email } : {};

        const payments = await paymentCollection
          .find(filter)
          .sort({ payment_time: -1 }) // latest first
          .toArray();

        res.send({ success: true, data: payments });
      } catch (error) {
        console.error("Error fetching payments:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch payment history" });
      }
    });

    // GET /riders
    app.get("/riders/pending", verifyFBToken, verifyAdmin, async (req, res) => {
      try {
        const pendingRiders = await ridersCollection
          .find({ status: "pending" })
          .toArray();
        res.send(pendingRiders);
      } catch (error) {
        console.error("Error fetching pending riders:", error.message);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // GET /riders/approved
    app.get(
      "/riders/approved",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const approvedRiders = await ridersCollection
            .find({ status: "approved" })
            .toArray();
          res.json(approvedRiders);
        } catch (error) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
    );

    // Add these 2 endpoints to your existing backend

    // GET /riders?status=available - Get available riders
    app.get("/riders", verifyFBToken, verifyAdmin, async (req, res) => {
      try {
        const { status } = req.query;

        let query = {};
        if (status === "available") {
          query = { status: "approved" };
        } else if (status) {
          query = { status };
        }

        const riders = await ridersCollection
          .find(query)
          .project({
            _id: 1,
            name: 1,
            phone: 1,
            district: 1,
            region: 1,
          })
          .toArray();

        res.send(riders);
      } catch (error) {
        console.error("Error fetching riders:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // PATCH /parcels/:id/assign - Assign rider to parcel
    app.patch(
      "/parcels/:id/assign",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const parcelId = req.params.id;
          const { riderId } = req.body;

          // Get rider details
          const rider = await ridersCollection.findOne({
            _id: new ObjectId(riderId),
          });

          if (!rider) {
            return res.status(404).send({
              success: false,
              message: "Rider not found",
            });
          }

          // Update parcel with rider info
          const result = await parcelCollection.updateOne(
            { _id: new ObjectId(parcelId) },
            {
              $set: {
                assigned_rider_id: new ObjectId(riderId),
                assigned_rider_name: rider.name,
                assigned_rider_phone: rider.phone,
                delivery_status: "on_the_way",
              },
            }
          );

          res.send({
            success: true,
            message: "Rider assigned successfully",
            data: result,
          });
        } catch (error) {
          console.error("Error assigning rider:", error);
          res.status(500).send({
            success: false,
            message: "Internal server error",
          });
        }
      }
    );

    // PATCH /riders
    app.patch("/riders/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status, email } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status },
      };

      try {
        const result = await ridersCollection.updateOne(query, updateDoc);
        // update user role for approved riders
        if (status === "approved") {
          const userQuery = { email };
          const userUpdateDoc = {
            $set: { role: "rider" },
          };
          const userResult = await usersCollection.updateOne(
            userQuery,
            userUpdateDoc
          );
          console.log("User role updated:", userResult.modifiedCount);
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // POST /riders
    app.post("/riders", async (req, res) => {
      const rider = req.body;
      const result = await ridersCollection.insertOne(rider);
      res.send(result);
    });

    // POST /tracking
    app.post("/tracking", async (req, res) => {
      const {
        trackingId,
        parcelId,
        status,
        message,
        updated_by = "",
      } = req.body;

      const log = {
        trackingId,
        parcelId: parcelId ? new ObjectId(parcelId) : undefined,
        status,
        message,
        time: new Date(),
        updated_by,
      };

      const result = await trackingCollection.insertOne(log);
      res.send({ success: true, insertedId: result.insertedId });
    });

    // POST /payments - mark parcel as paid and save payment record
    app.post("/payments", async (req, res) => {
      try {
        const {
          parcelId,
          email,
          transactionId,
          amount,
          paymentTime,
          paymentMethod,
        } = req.body;

        if (!parcelId || !email || !transactionId || !amount) {
          return res
            .status(400)
            .send({ success: false, message: "Missing payment information" });
        }

        // 1. Update the parcel's payment_status to "paid"
        const parcelUpdateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          { $set: { payment_status: "paid" } }
        );

        // 2. Insert into payments collection
        const paymentRecord = {
          parcelId: new ObjectId(parcelId),
          email, // could be same as created_by
          transactionId,
          amount: amount / 100,
          paymentMethod,
          paid_at: new Date().toISOString(),
          payment_time: paymentTime || new Date(), // fallback to server time
        };

        const paymentInsertResult = await paymentCollection.insertOne(
          paymentRecord
        );

        res.send({
          success: true,
          message: "Payment recorded, parcel marked as paid",
          data: {
            parcelUpdateResult,
            paymentInsertResult,
          },
        });
      } catch (error) {
        console.error("Error in /payments:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
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
