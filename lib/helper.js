const path = require('path');
const os = require('os');
const {Storage} = require('@google-cloud/storage');
const moment = require('moment');

const storage = new Storage({
  projectId: "amz-ratio",
  keyFilename: path.join(__dirname, "../assets/amz-ratio-firebase-adminsdk-2l46t-7a2f440c12.json")
});

const bucket = storage.bucket("gs://amz-ratio.appspot.com");

module.exports.curDir = function () {
  const isPkg = typeof process.pkg !== 'undefined'
  return isPkg ? path.dirname(process.execPath) : path.dirname(__dirname);
}

module.exports.upload = async function(filepath) {
  const info = path.parse(filepath);
  let folder = ".";
  if (info.name.startsWith("keyword")) {
    folder = "keywords";
  } else if (info.name.startsWith("result")) {
    folder = "results";
  }
  let fileDes = `${folder}/${info.name}-${os.hostname()}-${moment().format()}${info.ext}`;
  return await bucket.upload(filepath, {
    destination: fileDes
  })
}