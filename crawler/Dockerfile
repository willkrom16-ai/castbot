FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package.json ./
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium

COPY . .

CMD ["npm", "start"]
