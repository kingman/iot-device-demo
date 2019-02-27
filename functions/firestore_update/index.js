const {google} = require('googleapis');
const functions = require('firebase-functions');
exports.updateFunc = functions.firestore
    .document('devices/{deviceId}/config/{configId}')
    .onUpdate((change, context) => {
      const newValue = change.after.data();

      getClient(client => {
        setDeviceConfig(
          client,
          context.params.configId,
          '<registry_id>',
          '<project_id>',
          'us-central1',
          JSON.stringify(newValue, null, 2),
          '0'
        )
      })
    });

function setDeviceConfig(
  client,
  deviceId,
  registryId,
  projectId,
  cloudRegion,
  data,
  version
) {
  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;

  const binaryData = Buffer.from(data).toString('base64');
  const request = {
    name: `${registryName}/devices/${deviceId}`,
    versionToUpdate: version,
    binaryData: binaryData,
  };

  client.projects.locations.registries.devices.modifyCloudToDeviceConfig(
    request,
    (err, data) => {
      if (err) {
        console.log('Could not update config:', deviceId);
        console.log('Message: ', err);
      } else {
        console.log('Success :', data);
      }
    }
  );
  // [END iot_set_device_config]
}

function getClient(cb) {
  google.auth.getApplicationDefault()
  .then(res => {
    let auth = res.credential;
    if (auth.createScopedRequired && auth.createScopedRequired()) {
      const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
      auth = auth.createScoped(scopes);
    }
    client = google.cloudiot({
      version: 'v1',
      auth: auth
    });
    cb(client);
	  return 0;
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
}
