const {Logging} = require('@google-cloud/logging');
const projectId = 'ota-iot-231619';

const logging = new Logging({projectId});
exports.monitorLogging = (event, context) => {
  const pubsubMessage = event.data;
  const logData = JSON.parse(Buffer.from(pubsubMessage, 'base64').toString());

  const log = logging.log('device-logs');
  const metadata = {
      // Set the Cloud IoT Device you are writing a log for
      // you extract the required device info from the PubSub attributes
      resource: {
        type: 'cloudiot_device',
        labels: {
          project_id: event.attributes.projectId,
          device_num_id: event.attributes.deviceNumId,
          device_registry_id: event.attributes.deviceRegistryId,
          location: event.attributes.location,
        }
      },
      labels: {
        // note device_id is not part of the monitored resource, but you can
        // include it as another log label
        device_id: event.attributes.deviceId,
      }
    };

    // Here you optionally extract a severity value from the log payload if it
    // is present
    const validSeverity = [
      'DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'ALERT', 'CRITICAL',
      'EMERGENCY'
    ];
    if (logData.severity &&
      validSeverity.indexOf(logData.severity.toUpperCase()) > -1) {
      metadata['severity'] = logData.severity.toUpperCase();
      delete (logData.severity);
      // write the log entryto Stackdriver Logging
      const entry = log.entry(metadata, logData);
      return log.write(entry);
    }
};
