#1/bin/sh

curl -X POST -H "Content-Type: application/json" \
  -d @document.example.json \
  http://localhost:9080/db/test

