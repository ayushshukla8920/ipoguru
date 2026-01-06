const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

const registrarLogos = {
    "K-Fintech": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMor6R-6eWVrfYwc-p_5MrUkKzbJsujNNX0w&s",
    "Bigshare": "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/2a942901-f5da-423a-990f-a769a63cbc49.png",
    "Link Intime": "https://www.linkintime.co.in/images/Link-Intime_Logo.png"
};

app.get("/", async (req, res) => {
    try {
        const url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo";
        const response = await fetch(url);
        const { reportTableData } = await response.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rowPromises = reportTableData.map(async (el) => {
            const listingDate = new Date(el["~Str_Listing"]);
            const name = el.Name.split(">")[1].split("<")[0];
            const ipoPath = el.Name.split('"')[1].substring(4);
            const rrp = await fetch("https://investorgain.com/ipo" + ipoPath);
            const html = await rrp.text();
            let regType = "Unknown";
            if (html.includes("Kfin Technologies Ltd.")) regType = "K-Fintech";
            else if (html.includes("Bigshare Services Pvt.Ltd.")) regType = "Bigshare";
            else if (html.includes("Link Intime India Private Ltd")) regType = "Link Intime";
            const logoUrl = registrarLogos[regType];
            const registrarDisplay = logoUrl
                ? `<div class="reg-logo-wrapper"><img src="${logoUrl}" title="${regType}" alt="${regType}" /></div>`
                : `<span class="badge-unknown">${regType}</span>`;
            const gmpRaw = el.GMP.includes("<b>") ? el.GMP.split("<b>")[1].split("</b>")[0] : "0";
            const gmpAmt = parseFloat(gmpRaw.replace(/[^\d.-]/g, '')) || 0;
            const gmpPercent = el["~gmp_percent_calc"] || "0";
            const gmpClass = gmpAmt < 0 ? "negative-gmp" : "positive-gmp";
            return `
                <tr>
                    <td class="name-cell">
                        <strong>${name}</strong>
                        <div class="sub-text">Price: ₹${el["Price (₹)"]} | Lot: ${el.Lot}</div>
                    </td>
                    <td>
                        <div class="gmp-val ${gmpClass}">₹${gmpAmt}</div>
                        <div class="gmp-pct">${gmpPercent}%</div>
                    </td>
                    <td>
                        <div class="date-grid">
                            <span>Allotment: <b>${el["BoA Dt"]}</b></span>
                            <span>Listing: <b>${el["Listing"].split("<")[0]}</b></span>
                        </div>
                    </td>
                    <td class="reg-cell">${registrarDisplay}</td>
                </tr>
            `;
        });
        const rowsContent = (await Promise.all(rowPromises)).filter(row => row !== null).join("");
        const htmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>IPO Guru</title>
            <style>
                :root {
                    --bg: #0f1115;
                    --card: #1c1f26;
                    --accent: #ffb700ff;
                    --border: #2d333f;
                    --text-main: #f3f4f6;
                    --text-dim: #9ca3af;
                    --success: #10b981;
                    --danger: #ef4444;
                }
                body {
                    margin: 0;
                    font-family: 'Segoe UI', Roboto, sans-serif;
                    background-color: var(--bg);
                    color: var(--text-main);
                }
                .container {
                    max-width: 1000px;
                    margin: 40px auto;
                    padding: 0 20px;
                }
                header {
                    margin-bottom: 30px;
                    border-left: 4px solid var(--accent);
                    padding-left: 15px;
                }
                h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
                p { color: var(--text-dim); margin: 5px 0 0 0; font-size: 14px; }

                .table-container {
                    background: var(--card);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                th {
                    background: #252a33;
                    padding: 16px;
                    color: var(--text-dim);
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                td {
                    padding: 18px 16px;
                    border-bottom: 1px solid var(--border);
                }
                tr:last-child td { border-bottom: none; }
                tr:hover { background-color: #252a33; }

                .name-cell strong { display: block; font-size: 16px; margin-bottom: 4px; color: var(--accent); }
                .sub-text { font-size: 12px; color: var(--text-dim); }
                
                .gmp-val { font-weight: 700; font-size: 17px; }
                .positive-gmp { color: var(--success); }
                .negative-gmp { color: var(--danger); }
                .gmp-pct { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

                .date-grid { font-size: 12px; line-height: 1.6; }
                .date-grid b { color: var(--text-main); }
                .date-grid span { display: block; }

                .reg-logo-wrapper {
                    height: 40px;
                    width: 110px;
                    background: white;
                    padding: 5px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
                }
                .reg-logo-wrapper img {
                    max-height: 100%;
                    max-width: 100%;
                    object-fit: contain;
                }
                .badge-unknown {
                    font-size: 11px;
                    padding: 4px 8px;
                    background: var(--border);
                    border-radius: 4px;
                    color: var(--text-dim);
                }
                @media (max-width: 600px) {
                    .date-grid span { font-size: 10px; }
                    .reg-logo-wrapper { width: 80px; height: 30px; }
                    .container { margin: 20px auto; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>IPO Guru</h1>
                    <p>Live GMP data & Registrar details for upcoming listings</p>
                </header>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>IPO Details</th>
                                <th>GMP Status</th>
                                <th>Key Dates</th>
                                <th>Registrar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsContent || '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-dim);">No upcoming IPOs found at the moment.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
        `;
        res.status(200).send(htmlPage);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.listen(3000, () => console.log("Server running at http://localhost:3000"));