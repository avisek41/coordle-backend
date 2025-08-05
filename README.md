# Coordle Backend

A Node.js Express backend API for the Coordle application, built with TypeScript and MongoDB.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: Fast, unopinionated web framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Security**: Helmet for security headers, CORS support
- **Logging**: Morgan for HTTP request logging
- **Development**: Hot reload with ts-node-dev
- **Environment**: Environment variable support with dotenv

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coordle-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Then edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/coordle
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   
   # Logging
   LOG_LEVEL=debug
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```
This starts the server with hot reload using ts-node-dev.

### Production Mode
```bash
npm run build
npm start
```

## 📁 Project Structure

```
coordle-backend/
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Remove dist directory
- `npm run prebuild` - Clean before building

## 🌐 API Endpoints

### Health Check
- `GET /health` - Server health status

### Root
- `GET /` - API information and available endpoints

### API Routes
- `GET /api` - API endpoint (to be implemented)

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: JSON body parsing with size limits
- **Error Handling**: Centralized error handling middleware

## 📊 Logging

The application uses Morgan for HTTP request logging with the 'combined' format.

## 🗄️ Database

The application connects to MongoDB using Mongoose. Make sure MongoDB is running locally or update the `MONGODB_URI` in your `.env` file.

## 🚨 Error Handling

The application includes:
- Global error handling middleware
- 404 route handler
- Graceful shutdown handling
- MongoDB connection error handling

## 🔄 Development Workflow

1. Start MongoDB
2. Create `.env` file from `.env.example`
3. Run `npm run dev`
4. Access the API at `http://localhost:3000`

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/coordle |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:3000 |
| `LOG_LEVEL` | Logging level | debug |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License. 