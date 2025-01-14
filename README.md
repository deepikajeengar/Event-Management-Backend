# Node.js, Express, MongoDB Project

This project uses Node.js, Express, and MongoDB for the backend API. It is also deployed on Vercel.

## Local Setup Steps

Follow the steps below to set up the project on your local machine:

### 1. Prerequisites

You need to have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (or you can use MongoDB Atlas)
- [Git](https://git-scm.com/)
- [Vercel CLI](https://vercel.com/docs/cli) (if you want to deploy on Vercel)

### 2. Clone the Repository

First, clone the repository from GitHub:

```bash
git clone  https://github.com/deepikajeengar/Event-Management-Backend.git
cd Backend
```

### 3. Install Dependencies
To install the required dependencies, run the following command in your terminal:

```bash
npm install
```

### 4. MongoDB Setup
If you're using a local MongoDB server:

1. Install and run MongoDB locally.
2. You'll need to configure your MongoDB connection URI. This can be done in the `.env` file.

If you're using MongoDB Atlas:

1. Create a free cluster on MongoDB Atlas.
2. Add the connection string to your `.env` file:

```bash
MONGODB_URI=<your_mongodb_connection_string>
```

### 5. Create .env File
Create a `.env` file in the root of your project and add the following environment variables:

```bash
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
```

### 6. Start the Server
To start the server, run the following command:

```bash
npm start
```

This will start the backend server on your local machine, and you can access the API at `http://localhost:5000`.

### 7. Vercel Deployment
If you want to deploy your project on Vercel, follow these steps:

1. Install the Vercel CLI:
```bash
npm install -g vercel
```

2. Log in to Vercel CLI:
```bash
vercel login
```

3. Deploy the project with the following command:
```bash
vercel
```

You will be prompted to select your project, and Vercel will automatically deploy your app.

### 8. API Endpoints
`GET /api/events:` Retrieve all events.

`POST /api/events:` Create a new events.

You can customize these endpoints as per your project's requirements.

### 9. Testing
You can test your API using tools like Postman or any other HTTP client. Use `localhost:5000` for local testing or the URL provided by Vercel once deployed.

### 10. Production & Further Configuration
Make sure your environment variables are securely configured in production. Double-check the MongoDB connection string and other configurations for a smooth deployment.

**Your backend API is successfully set up.**

**Thank You**

