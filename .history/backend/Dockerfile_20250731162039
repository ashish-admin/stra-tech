# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Prevent python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Ensure python output is sent straight to the terminal
ENV PYTHONUNBUFFERED 1

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the local app code and the pre-seeded database to the container
COPY . .

# Run the Gunicorn server
# It will serve the app created by the create_app factory in the 'app' module
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "run:app"]