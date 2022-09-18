const express = require("express");
const app = express();
const port = 4567;
const path = require("path");
const router = express.Router();
const { sendZipFiles, zipTest } = require("./helperFunctions");
const { transform } = require("./main");

app.listen(process.env.port || port);
console.log(`Figmaweb server listening on http://localhost:${port}`);

//add the router
app.use("/", router);
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
// serve css as static
app.use(express.static(__dirname));

router.get("/", function (req, res) {
  res.send("Home");
});

router.get("/raw/:figma_id", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  const figma_id = req.params.figma_id;
  transform(res, "raw", figma_id);
});

router.get("/react/:figma_id", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  const figma_id = req.params.figma_id;
  transform(res, "react", figma_id);
});
