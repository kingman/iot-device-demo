exports.logging = (event, context) => {
  const msgStream = event.data;
  const attributes =  event.attributes;
  const msgStr = Buffer.from(msgStream, 'base64').toString();
  console.log('message: %s attributes: %O', msgStr, attributes);
};
