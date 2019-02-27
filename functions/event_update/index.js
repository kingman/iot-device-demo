const admin = require('firebase-admin');
exports.eventUpdate = (event, context) => {
  var db = initializeAppFunctions();
  const pubsubMessage = event.data;
  const deviceId = event.attributes.deviceId;
  var msgObj = JSON.parse(Buffer.from(pubsubMessage, 'base64').toString());
  addData(db, deviceId, msgObj)
  .then(() => console.log("Value written to firestore for device: %s", deviceId))
  .catch(console.error);
};

function initializeAppFunctions() {
  process.env.GCLOUD_PROJECT = '<project_id>';
  // [START initialize_app_functions]
  const functions = require('firebase-functions');

  if (!admin.apps.length) {
      admin.initializeApp(functions.config().firebase);
  }

  var db = admin.firestore();

  // [END initialize_app_functions]
  return db;
}

function addData(db, deviceId, data) {
  var lampRef = db.collection('devices').doc(deviceId);
  var setValue = lampRef.set(data, {merge:true});
  return Promise.all([setValue]);
}
