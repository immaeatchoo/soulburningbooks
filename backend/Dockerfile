# Use official Python base image
FROM python:3.11

# Set the working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose the port Flask will run on
EXPOSE 8000

# Run the app
CMD ["python", "app.py"]