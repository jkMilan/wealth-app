#!/bin/bash

# 1. Start the Python AI in the background on port 8000
cd welth-ml-service
uvicorn main:app --host 127.0.0.1 --port 8000 &

# 2. Go back to the main folder and start the Next.js Live Server
cd /app
npm run start