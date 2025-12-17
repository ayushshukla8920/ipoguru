const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.get("/gmp", async (req, res) => {
    const url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/12/2025/2025-26/0/ipo"
    const response = await fetch(url);
    const {reportTableData} = await response.json();
    const GMP = {};
    reportTableData.forEach(el => {
        GMP[el.Name.split(">")[1].split("<")[0]] = {
            amt: (el.GMP.split(">")[1].split('<')[0] != "--") ? Number(el.GMP.split(">")[1].split('<')[0]): 0,
            percentage: el.GMP.split(">")[2].split('<')[0].split('(')[1].split(')')[0]
        }
    });
    return res.status(200).json(GMP);
})
app.listen(3000, () => console.log("Listening at 3000"));