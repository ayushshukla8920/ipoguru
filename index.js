// const express = require('express');
// const app = express();
// const cors = require('cors');
// app.use(cors());
// app.get("/gmp", async (req, res) => {
//     const url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo"
//     const response = await fetch(url);
//     const {reportTableData} = await response.json();
//     const GMP = {};
//     reportTableData.forEach(el => {
//         GMP[el.Name.split(">")[1].split("<")[0]] = {
//             amt: (el.GMP.split(">")[1].split('<')[0] != "--") ? Number(el.GMP.split(">")[1].split('<')[0]): 0,
//             percentage: el.GMP.split(">")[2].split('<')[0].split('(')[1].split(')')[0]
//         }
//     });
//     return res.status(200).json(GMP);
// })
// app.listen(3000, () => console.log("Listening at 3000"));
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());

app.get("/gmp", async (req, res) => {
    const url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo";
    const response = await fetch(url);
    const { reportTableData } = await response.json();

    let rows = "";

    reportTableData.forEach(el => {
        const name = el.Name.split(">")[1].split("<")[0];
        const gmpValue = el.GMP.split(">")[1].split("<")[0];
        const amt = gmpValue !== "--" ? Number(gmpValue) : 0;
        const percentage = el.GMP.split(">")[2]
            .split("<")[0]
            .split("(")[1]
            .split(")")[0];

        rows += `
            <tr>
                <td>${name}</td>
                <td>${amt}</td>
                <td>${percentage}</td>
            </tr>
        `;
    });

    const html = `
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

    res.status(200).send(html);
});

app.listen(3000, () => console.log("Listening at 3000"));
