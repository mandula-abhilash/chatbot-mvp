# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /src

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]