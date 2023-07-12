#! /bin/bash

echo '[INFO] Credstore automation has been started!'

SPACE_NAME=$(cf t | grep "space:" |  awk '{print $2; exit}')
CRED_STORE_SERVICE_NAME="${SPACE_NAME}-susaas-credstore"

cf create-service-key $CRED_STORE_SERVICE_NAME automator-key
KEY=$(cf service-key $CRED_STORE_SERVICE_NAME automator-key | tail -n+3)

echo $KEY > configs/automator/binding.json

BROKER_PASS=$(cat broker/brokerpass.txt)

echo "SH-PWD:"$PWD
echo "Broker pass:"$BROKER_PASS

npm run init:credstore --broker-pass $BROKER_PASS