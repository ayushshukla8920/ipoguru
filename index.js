const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const { error } = require("console");
require("dotenv").config();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB Connected"));
const panCardSchema = new mongoose.Schema({
    pan: { type: String, required: true },
    name: { type: String, default: "Unknown" }
}, { _id: false });
const userSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    pin: { type: String, required: true },
    panCards: [panCardSchema]
});
const User = mongoose.model("User", userSchema);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, "public")));
const registrarLogos = {
    "K-Fintech": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMor6R-6eWVrfYwc-p_5MrUkKzbJsujNNX0w&s",
    "Bigshare": "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/2a942901-f5da-423a-990f-a769a63cbc49.png",
    "Link Intime": "https://www.linkintime.co.in/images/Link-Intime_Logo.png"
};
const protectApi = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};
async function getIpoData() {
    const response = await fetch("https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo");
    return await response.json();
}
app.get("/api/ipos", async (req, res) => {
    try {
        const { reportTableData } = await getIpoData();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ipos = reportTableData
            .filter(el => new Date(el["~Str_Listing"]) >= today)
            .map(el => {
                const name = el["~ipo_name"];
                const slug = el.Name.split('"')[1].split("/")[2];
                const gmpRaw = el.GMP.includes("<b>") ? el.GMP.split("<b>")[1].split("</b>")[0] : "0";
                const gmpAmt = parseFloat(gmpRaw.replace(/[^\d.-]/g, '')) || 0;
                const gmpPercent = el["~gmp_percent_calc"] || "0";
                return {
                    name,
                    slug,
                    price: el["Price (₹)"],
                    lot: el.Lot,
                    gmp: gmpAmt,
                    gmpPercent,
                    listingDate: el.Listing.split("<")[0],
                    allotmentDate: el["BoA Dt"],
                    openDate: el["Open"],
                    closeDate: el["Close"]
                };
            });
        res.json({ success: true, data: ipos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to fetch IPO data" });
    }
});
app.get("/api/ipos/:slug", async (req, res) => {
    try {
        const { reportTableData } = await getIpoData();
        const item = reportTableData.find(el => el.Name.includes(req.params.slug));
        if (!item) return res.status(404).json({ success: false, error: "IPO not found" });
        const ipoPath = item.Name.split('"')[1].substring(4);
        const rrp = await fetch("https://investorgain.com/ipo/" + ipoPath);
        const html = await rrp.text();
        const subs = await fetch("https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/1/2026/2025-26/0/0/0");
        const subsjson = await subs.json();
        const subsData = subsjson.reportTableData;
        const subsItem = subsData.find(el => el["~URLRewrite_Folder_Name"].includes(req.params.slug)) || {};
        let regType = html.includes("Kfin") ? "K-Fintech" : html.includes("Bigshare") ? "Bigshare" : "Link Intime";
        const gmpRaw = item.GMP.includes("<b>") ? item.GMP.split("<b>")[1].split("</b>")[0] : "0";
        const gmpAmt = parseFloat(gmpRaw.replace(/[^\d.-]/g, '')) || 0;
        const gmpPercent = item["~gmp_percent_calc"] || "0";
        res.json({
            success: true,
            data: {
                name: item["~ipo_name"],
                slug: req.params.slug,
                price: item["Price (₹)"],
                lot: item.Lot,
                gmp: gmpAmt,
                gmpPercent,
                listingDate: item.Listing.split("<")[0],
                allotmentDate: item["BoA Dt"],
                openDate: item["Open"],
                closeDate: item["Close"],
                registrar: regType,
                registrarLogo: registrarLogos[regType],
                subscription: subsItem["Total (x)"] ? subsItem["Total (x)"] + "x" : "N/A"
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to fetch IPO details" });
    }
});
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { phone, pin } = req.body;
        if (!phone || !pin) {
            return res.status(400).json({ success: false, error: "Phone and PIN are required" });
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({ success: false, error: "PIN must be exactly 4 digits" });
        }
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Phone number already registered" });
        }
        const hashedPin = await bcrypt.hash(pin, 10);
        const user = await User.create({ phone, pin: hashedPin, panCards: [] });
        res.json({ success: true, message: "Account created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to create account" });
    }
});
app.post("/api/auth/login", async (req, res) => {
    try {
        const { phone, pin } = req.body;
        if (!phone || !pin) {
            return res.status(400).json({ success: false, error: "Phone and PIN are required" });
        }
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(401).json({ success: false, error: "Account not found" });
        }
        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid PIN" });
        }
        const token = jwt.sign({ id: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: "7d" });
        res.json({
            success: true,
            token,
            user: { phone: user.phone, panCount: user.panCards.length }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Login failed" });
    }
});
app.get("/api/user/profile", protectApi, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-pin");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });
        res.json({ success: true, data: { phone: user.phone, panCards: user.panCards } });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
});
app.get("/api/user/pan", protectApi, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, data: user.panCards });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to fetch PAN cards" });
    }
});
app.post("/api/user/pan", protectApi, async (req, res) => {
    try {
        const { pan } = req.body;
        const upperPan = pan?.toUpperCase();
        if (!upperPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(upperPan)) {
            return res.status(400).json({ success: false, error: "Invalid PAN format" });
        }
        const user = await User.findById(req.user.id);
        const exists = user.panCards.some(p => p.pan === upperPan);
        if (exists) {
            return res.status(400).json({ success: false, error: "PAN already exists" });
        }
        await User.findByIdAndUpdate(req.user.id, {
            $push: { panCards: { pan: upperPan, name: "Unknown" } }
        });
        res.json({ success: true, message: "PAN added successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to add PAN" });
    }
});
app.patch("/api/user/pan/:pan", protectApi, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, error: "Name is required" });
        }
        const result = await User.findOneAndUpdate(
            { _id: req.user.id, "panCards.pan": req.params.pan.toUpperCase() },
            { $set: { "panCards.$.name": name.trim() } },
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ success: false, error: "PAN not found" });
        }
        res.json({ success: true, message: "Name updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to update name" });
    }
});
app.delete("/api/user/pan/:pan", protectApi, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { panCards: { pan: req.params.pan.toUpperCase() } }
        });
        res.json({ success: true, message: "PAN removed successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to remove PAN" });
    }
});
app.post("/api/checkallotedyet", async (req, res) => {
    try {
        const { ipoName, registrar } = req.body;
        let isAllotmentAvailable = false;
        let clientId = null;
        if (!ipoName || !registrar) {
            return res.status(400).json({ success: false, error: "IPO name and registrar are required" });
        }
        if (registrar == "K-Fintech") {
            const url = "https://ipostatus.kfintech.com/static/js/main.0ec4c140.js";
            const js = await (await fetch(url)).text();
            const match = js.match(/const\s+rf\s*=\s*JSON\.parse\('([^']*)'\)/);
            const jsonString = match[1];
            const rf = JSON.parse(jsonString);
            const alloted = rf.find((item) => item.name.toLowerCase().includes(ipoName.toLowerCase().substring(0, ipoName.length - 5)));
            isAllotmentAvailable = alloted ? true : false;
            clientId = alloted?.clientId;
        }
        res.json({
            success: isAllotmentAvailable,
            data: {
                allotmentAvailable: isAllotmentAvailable,
                clientId: clientId,
                message: isAllotmentAvailable ? "Allotment results are available" : "Allotment results not yet announced"
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to check allotment status" });
    }
});
app.post("/api/checkallotment", protectApi, async (req, res) => {
    try {
        const { ipoName, registrar, pan, clientId } = req.body;
        if (!ipoName || !registrar || !pan) {
            return res.status(400).json({ success: false, error: "IPO name, registrar, and PAN are required" });
        }
        if (registrar == "K-Fintech") {
            const url = "https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan";
            const data = await (await fetch(url, {
                method: "GET",
                headers: {
                    "reqparam": pan.toUpperCase(),
                    "client_id": clientId
                }
            })).json();
            if (data.error == "Record Not Found") {
                return res.json({
                    success: false,
                    data: {
                        status: "Not Applied",
                        pan: pan.toUpperCase(),
                        name: null,
                        shares: "0 Alloted",
                        registrar: registrar
                    }
                });
            }
            else {
                await User.findOneAndUpdate(
                    { _id: req.user.id, "panCards.pan": pan.toUpperCase() },
                    { $set: { "panCards.$.name": data.data[0]["Name"].split(".")[1].substring(1) } }
                );
                return res.json({
                    success: true,
                    data: {
                        status: data.data[0].All_Shares > 0 ? "Allotted" : "Not Allotted",
                        pan: pan.toUpperCase(),
                        name: data.data[0]["Name"].split(".")[1].substring(1),
                        shares: data.data[0].All_Shares + " Allotted",
                        registrar: registrar
                    }
                });
            }
        }
        res.json({
            success: true,
            data: {
                pan: pan.toUpperCase(),
                name: randomName,
                status: randomStatus,
                shares: sharesAllotted,
                registrar: registrar
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Failed to check allotment" });
    }
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});
app.get("/allotment", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "allotment.html"));
});
app.get("/ipo", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "ipo.html"));
});
app.listen(3000, () => console.log("API Server running at http://localhost:3000"));