# Environment setup
Following code are execute from the Cloud Shell
## Set environment variables
```bash
export PROJECT_ID=<project_id>
export EVENT_TOPIC=lamp-event
export LOG_TOPIC=lamp-log
export STATE_TOPIC=lamp-state
export REGISTRY_ID=<registry_id>
export REGION=europe-west1
export GATEWAY_ID=hub
export DEVICE_PRE=lamp
export GATEWAY_PRIVATE_KEY=gateway_private.pem
export GATEWAY_PUBLIC_KEY=gateway_public.pem
export DEVICE_PRIVATE_KEY=device_private.pem
export DEVICE_PUBLIC_KEY=device_public.pem
export CA_CERTS=roots.pem
export ALGORITHM=RS256
```
## Create Pub/Sub topics
```bash
gcloud pubsub topics create $LOG_TOPIC
gcloud pubsub topics create $STATE_TOPIC
gcloud pubsub topics create $EVENT_TOPIC
```
## Create IoT Core registry from CLI - Use Cloud Shell
```bash
gcloud iot registries create $REGISTRY_ID \
--region $REGION \
--event-notification-config=subfolder=log,topic=$LOG_TOPIC \
--event-notification-config=topic=$EVENT_TOPIC \
--state-pubsub-topic=$STATE_TOPIC
```
## Create Gateway key pair
```bash
openssl genrsa -out $GATEWAY_PRIVATE_KEY 2048 && \
openssl rsa -in $GATEWAY_PRIVATE_KEY \
-pubout -out $GATEWAY_PUBLIC_KEY
```
## Create Device key pair
```bash
openssl genrsa -out $DEVICE_PRIVATE_KEY 2048 && \
openssl rsa -in $DEVICE_PRIVATE_KEY \
-pubout -out $DEVICE_PUBLIC_KEY
```
## Create gateway where device connect through association
```bash
gcloud iot devices create $GATEWAY_ID \
--device-type=gateway \
--region=$REGION \
--registry=$REGISTRY_ID \
--public-key=path=$GATEWAY_PUBLIC_KEY,type=rsa-pem \
--auth-method=association-only
```
## Create device without key and bind it to gateway
```bash
gcloud iot devices create "${DEVICE_PRE}1" \
--region=$REGION \
--registry=$REGISTRY_ID && \
gcloud iot devices gateways bind \
--device="${DEVICE_PRE}1" \
--device-region=$REGION \
--device-registry=$REGISTRY_ID \
--gateway=$GATEWAY_ID \
--gateway-region=$REGION \
--gateway-registry=$REGISTRY_ID
```
## Create cloud function for debugging device activity
```bash
cd functions/logging
gcloud beta functions deploy logging \
--region $REGION \
--trigger-topic $LOG_TOPIC \
--runtime nodejs8 \
--memory 128mb
```
## Download root certificate
```bash
cd ../..
curl https://pki.google.com/roots.pem > roots.pem
```
## Test communication flow
```bash
virtualenv env && source env/bin/activate
pip install -r requirements.txt
python device_com_test.py
```
Brows to [Cloud Functions Console](https://console.cloud.google.com/functions) and click on the `logging` function. Under 'logging' function click on `VIEW LOGS` to access the function log. Refresh the log and verify that connected message appears in the log.

## Change device through gateway authentication method
```bash
gcloud beta iot devices update $GATEWAY_ID \
--region=$REGION \
--registry=$REGISTRY_ID \
--auth-method=device-auth-token-only
```
Re-run the communication test script and verify the it fails with authentication error
```bash
python device_com_test.py
```
## Add public key to device
```bash
gcloud iot devices credentials create \
--path=$DEVICE_PUBLIC_KEY \
--type=rsa-pem \
--device="${DEVICE_PRE}1" \
--region=$REGION \
--registry=$REGISTRY_ID
```
## Use device auth token to communicate through gateway
In `device_com_test.py` comment out line:
```py
gateway_client.attach_device(device_id)
```
and uncomment line:
```py
gateway_client.attach_device(device_id, device_private_key, device_key_algorithm)
```
Re-run the communication test script and verify the message goes all way through to Cloud Functions log
```bash
python device_com_test.py
```
## Switch back to association-only mode
Through out rest of this workshop, we be using the `association-only` for the convenience of no need to provide key pair for every device created
```bash
gcloud beta iot devices update $GATEWAY_ID \
--region=$REGION \
--registry=$REGISTRY_ID \
--auth-method=association-only
```
