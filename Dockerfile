# Start with a lightweight Python server
FROM python:3.12-slim

# Install Node.js, Tesseract OCR, and OpenCV system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy your entire project into the server
COPY . .

# --- 1. BUILD THE PYTHON AI ---
RUN pip install --no-cache-dir -r welth-ml-service/requirements.txt
RUN python -m spacy download en_core_web_sm

# --- 2. BUILD THE NEXT.JS APP ---
# We pass the Prisma database URL during the build step if needed
RUN npm install
RUN npx prisma generate
RUN npm run build

# Next.js runs on 3000
EXPOSE 3000

# Run the startup script
CMD ["sh", "start.sh"]