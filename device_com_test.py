import os
import json
import sys
from mqtt_client import MQTTClient

def create_mqtt_client():
    return MQTTClient(
        os.environ.get('PROJECT_ID'),
        os.environ.get('REGISTRY_ID'),
        os.environ.get('GATEWAY_ID'),
        os.environ.get('GATEWAY_PRIVATE_KEY'),
        os.environ.get('REGION'),
        os.environ.get('CA_CERTS'),
        os.environ.get('ALGORITHM'))

def main(argv):
    device_prefix = os.environ.get('DEVICE_PRE')
    gateway_id = os.environ.get('GATEWAY_ID')
    device_private_key = os.environ.get('DEVICE_PRIVATE_KEY')
    device_key_algorithm = os.environ.get('ALGORITHM')
    device_id='{}{}'.format(device_prefix, 1)

    gateway_client = create_mqtt_client()
    gateway_client.connect_to_server()
    gateway_client.subscribe_to_error_msg(gateway_id)

    gateway_client.attach_device(device_id)
    # gateway_client.attach_device(device_id, device_private_key, device_key_algorithm)

    payload = {}
    payload['connected'] = True
    payload['severity'] = 'INFO'
    gateway_client.send_event(device_id,  json.dumps(payload), 'log')

    gateway_client.detach_device(device_id)

    gateway_client.disconnect_from_server()

if __name__ == "__main__":
    main(sys.argv[1:])
