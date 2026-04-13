const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());
app.use(express.static("public"));


// --------------------
// MONGO CONNECT (SAFE)
// --------------------
mongoose.connect(process.env.mongodb+srv://jprivate0124_db_user:hMnQZVlaofa9zi9I@cluster0.pj86epo.mongodb.net/?appName=Cluster0)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => {
    console.log("❌ Mongo error:", err);
});


// --------------------
// SCHEMA
// --------------------
const KeySchema = new mongoose.Schema({
    key: String,
    user: String,
    expires: Date,
    ip: String
});

const Key = mongoose.model("Key", KeySchema);


// --------------------
// VERIFY KEY
// --------------------
app.post("/verify", async (req, res) => {
    try {
        const { key } = req.body;

        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress;

        const record = await Key.findOne({ key });

        if (!record) return res.json({ valid: false });

        if (new Date() > record.expires) {
            return res.json({ valid: false, reason: "expired" });
        }

        if (!record.ip) {
            record.ip = ip;
            await record.save();
        } else if (record.ip !== ip) {
            return res.json({ valid: false, reason: "ip_mismatch" });
        }

        res.json({ valid: true, user: record.user });

    } catch (err) {
        console.log("VERIFY ERROR:", err);
        res.status(500).json({ error: "server error" });
    }
});


// --------------------
// CREATE KEY
// --------------------
app.post("/create", async (req, res) => {
    try {
        const { user, days } = req.body;

        const key =
            Math.random().toString(36).substring(2, 10) + "-" +
            Math.random().toString(36).substring(2, 6);

        const expires = new Date();

        // safe default (prevents NaN crash)
        const d = Number(days) || 1;
        expires.setDate(expires.getDate() + d);

        const newKey = await Key.create({
            key,
            user,
            expires,
            ip: null
        });

        res.json(newKey);

    } catch (err) {
        console.log("CREATE ERROR:", err);
        res.status(500).json({ error: "server error" });
    }
});


// --------------------
// GET KEYS
// --------------------
app.get("/keys", async (req, res) => {
    try {
        const keys = await Key.find();
        res.json(keys);
    } catch (err) {
        console.log("KEYS ERROR:", err);
        res.status(500).json({ error: "server error" });
    }
});


// --------------------
// DELETE KEY
// --------------------
app.delete("/delete/:id", async (req, res) => {
    try {
        await Key.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.log("DELETE ERROR:", err);
        res.status(500).json({ error: "server error" });
    }
});


// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Running on port " + PORT);
});
