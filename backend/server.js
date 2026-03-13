const express = require("express")

const app = express()

app.get("/", (req, res) => {
    res.send("Backend toimii!")
})

app.listen(3000, () => {
    console.log("Server käynnissä portissa 3000")
})