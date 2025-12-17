const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.get("/", async (req, res) => {
    try {
        const url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo";
        const response = await fetch(url);
        const { reportTableData } = await response.json();
        const rowPromises = reportTableData.map(async (el) => {
            const name = el.Name.split(">")[1].split("<")[0];
            const ipoPath = el.Name.split('"')[1].substring(4);
            const rrp = await fetch("https://investorgain.com/ipo" + ipoPath);
            const html = await rrp.text();
            let reg = "Unknown";
            if (html.includes("Kfin Technologies Ltd.")) reg = "K-Fintech";
            else if (html.includes("Bigshare Services Pvt.Ltd.")) reg = "Bigshare";
            else if (html.includes("Link Intime India Private Ltd")) reg = "Link Intime";
            const gmpValue = el.GMP.split(">")[1].split("<")[0];
            const amt = gmpValue !== "--" ? Number(gmpValue) : 0;
            const percentage = el.GMP.split(">")[2]
                .split("<")[0]
                .split("(")[1]
                .split(")")[0];
            return `
                <tr>
                    <td>${name}</td>
                    <td>${amt}</td>
                    <td>${percentage}</td>
                    <td>${reg}</td>
                </tr>
            `;
        });
        const rows = (await Promise.all(rowPromises)).join("");
        const htmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>IPO GMP</title>
            <style>
                body {
                    margin: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    background-color: #1e1e1e;
                    color: #e0e0e0;
                }
                .container {
                    max-width: 900px;
                    margin: 40px auto;
                    padding: 20px;
                }
                h1 {
                    font-size: 20px;
                    margin-bottom: 20px;
                    font-weight: 500;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #333;
                }
                th {
                    color: #b0b0b0;
                    font-weight: 600;
                }
                tr:hover {
                    background-color: #2a2a2a;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>IPO Grey Market Premium (GMP)</h1>
                <table>
                    <thead>
                        <tr>
                            <th>IPO Name</th>
                            <th>GMP Amount</th>
                            <th>GMP %</th>
                            <th>Registrar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
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
app.listen(3000, () => console.log("Listening at 3000"));
