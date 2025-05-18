FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with production optimization
RUN npm ci --only=production

# Copy only necessary files
COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY *.js ./

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]