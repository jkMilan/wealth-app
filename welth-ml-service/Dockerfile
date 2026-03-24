# Use the official Python 3.10 image
FROM python:3.10

# Install the required system dependencies for OpenCV and Tesseract OCR
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Create a standard user to run the app safely (not as root)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first to install Python libraries
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Download the spaCy NLP model
RUN python -m spacy download en_core_web_sm

# Copy the rest of your machine learning code into the container
COPY --chown=user . .

# Start the FastAPI server on port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]