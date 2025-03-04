FROM sapse/approuter:14.3.4

# Create app directory
RUN mkdir -p /app
RUN chown node.node /app

WORKDIR /app

# Bundle app source
COPY . .

CMD [ "node", "index.js" ]