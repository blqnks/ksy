const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());
app.use(express.static("public"));

// 🔌 CONNECT TO MONGODB (replace with Atlas if needed)
mongoose.connect("mongodb+srv://jprivate0124_db_user:hMnQZVlaofa9zi9I@cluster0.pj86epo.mongodb.net/?appName=Cluster0")
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log(err));

// 📦 SCHEMA
const KeySchema = new mongoose.Schema({
    key: String,
    user: String,
    expires: Date,
    ip: String
});

const Key = mongoose.model("Key", KeySchema);

// 🔑 VERIFY KEY
app.post("/verify", async (req, res) => {
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
});

// ➕ CREATE KEY
app.post("/create", async (req, res) => {
    const { user, days } = req.body;

    const key =
        Math.random().toString(36).substring(2, 10) + "-" +
        Math.random().toString(36).substring(2, 6);

    const expires = new Date();
    expires.setDate(expires.getDate() + days);

    const newKey = await Key.create({
        key,
        user,
        expires,
        ip: null
    });

    res.json(newKey);
});

// 📋 GET KEYS
app.get("/keys", async (req, res) => {
    const keys = await Key.find();
    res.json(keys);
});

// ❌ DELETE KEY
app.delete("/delete/:id", async (req, res) => {
    await Key.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port " + PORT));
