import winston, { Logger } from 'winston';

// Define custom log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create a logger instance with the required transports (Console or File)
const logger: Logger = winston.createLogger({
  level: 'info', // Set default logging level
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }),
    new winston.transports.File({ filename: 'cserver.log' })
  ],
});

export default logger;
