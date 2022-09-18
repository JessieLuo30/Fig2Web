const JSZip = require("jszip");
const buffer = require("buffer");
const fs = require("fs");
const path = require("path");
globalThis.Blob = buffer.Blob;
JSZip.support.blob = true;

function sendZipFiles(res, figma_id, mode, foldername) {
  const zip = new JSZip();
  addFilesToZipFolder(zip, foldername);
  zip
    .generateInternalStream({ type: "uint8array" })
    .accumulate()
    .then((data) => {
      const zipFileName = foldername + ".zip";
      fs.writeFileSync(zipFileName, data);
      res.download(path.join(__dirname + "/" + zipFileName));
    });
}

function addFilesToZipFolder(zip, root) {
  const files = fs.readdirSync(path.join(__dirname + "/" + root));
  files.forEach((filename) => {
    const filepath = root + "/" + filename;
    if (!fs.statSync(filepath).isDirectory()) {
      const content = fs.readFileSync(filepath, "utf8");
      zip.file(filepath, content);
    } else {
      addFilesToZipFolder(zip, filepath);
    }
  });
}

function zipTest(res) {
  const zip = new JSZip();
  zip.file("index.html", fs.readFileSync("index.html"));
  zip.generateAsync({ type: "blob" }).then((blob) => {
    res.send(blob);
  });
}

module.exports = { sendZipFiles, zipTest };
