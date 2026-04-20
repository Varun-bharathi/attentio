# Use an official Python runtime as a base image
FROM python:3.10.12-slim

# Install system dependencies including Node.js and system libraries for OpenCV/DeepFace
RUN apt-get update && apt-get install -y \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port (Render assigns process.env.PORT automatically, but good practice to document)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
