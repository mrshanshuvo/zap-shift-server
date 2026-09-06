# Gram2City Backend

Backend API for Gram2City, a logistics and delivery platform built with Node.js, Express, TypeScript, and MongoDB.

The backend provides authentication, user management, parcel operations, rider management, finance services, support functionality, administrative operations, and public APIs.

## Overview

The Gram2City backend serves as the core API layer for the platform.

It follows a modular architecture where business domains are separated into independent modules. The application includes centralized error handling, request logging, security middleware, rate limiting, compression, authentication, and external service integrations.

## Features

* RESTful API
* Authentication and authorization
* User management
* Administrative management
* Parcel management
* Rider management
* Finance functionality
* Support functionality
* Public API endpoints
* Firebase Admin integration
* JWT-based authentication support
* MongoDB data persistence
* Mongoose ODM
* Stripe payment integration
* Cloudinary integration
* Socket.IO real-time communication
* Request validation with Zod
* File upload support
* Centralized error handling
* HTTP request logging
* Security headers
* CORS configuration
* Response compression
* API rate limiting
* Environment-based configuration

## Technology Stack

### Backend

* Node.js
* Express.js
* TypeScript

### Database

* MongoDB
* Mongoose

### Authentication

* Firebase Admin SDK
* JSON Web Token
* bcryptjs

### Payments & External Services

* Stripe
* Cloudinary
* Axios

### Real-Time Communication

* Socket.IO

### Validation & Security

* Zod
* Helmet
* CORS
* express-rate-limit
* Compression

### Logging & Development

* Morgan
* ESLint
* Prettier
* Husky
* lint-staged
* ts-node-dev

## Architecture

```text
Client Application
       │
       ▼
   Express API
       │
       ├── Middleware
       │    ├── Authentication
       │    ├── Validation
       │    ├── Security
       │    ├── Logging
       │    └── Error Handling
       │
       ▼
    API Routes
       │
       ▼
    Modules
       │
 ┌─────┼─────────────────────────────┐
 │     │        │       │      │     │
Auth  User   Parcel   Rider  Finance Support
 │     │        │       │      │     │
 └─────┴────────┴───────┴──────┴─────┘
                     │
                     ▼
                  MongoDB
```

## Core Modules

### Authentication

Handles authentication-related operations and integration with Firebase Admin and application-level authentication.

### Users

Provides user-related functionality and account management.

### Admin

Contains administrative functionality for managing platform operations.

### Parcels

Handles parcel and delivery-related workflows.

### Riders

Provides rider-related functionality for delivery operations.

### Finance

Handles financial and payment-related operations.

### Support

Provides support-related functionality and communication.

### Public

Contains publicly accessible API functionality.

## API Structure

The main application router organizes the API into the following domains:

```text
/admin
/auth
/user
/parcel
/rider
/finance
/support
/public
```

The exact endpoints within each module are defined by their respective route files.

## Health Check

The root endpoint provides API status information:

```http
GET /
```

Example response:

```json
{
  "success": true,
  "message": "Gram2City Logistics Enterprise API is running smoothly",
  "version": "2.3.0",
  "status": "healthy"
}
```

## Middleware

The application includes centralized middleware for:

### Security

* Helmet
* CORS
* Rate limiting

### Performance

* Compression

### Logging

* HTTP/application request logging

### Error Handling

* Centralized global error handler

### Validation

* Zod-based request validation

## Rate Limiting

The API currently uses `express-rate-limit`.

The configured limit is:

```text
1,000 requests
per 15-minute window
```

This protects the API from excessive request traffic while supporting normal dashboard and application usage.

## Environment Variables

Create a `.env` file based on `.env.example`.

Configuration includes:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

FB_SERVICE_KEY=your_firebase_service_key
```

Additional variables may be required for services such as Cloudinary.

Never commit:

* `.env`
* API keys
* Firebase service-account credentials
* Stripe secrets
* Database credentials
* JWT secrets

## Getting Started

### Prerequisites

* Node.js
* npm
* MongoDB
* Git

### Clone

```bash
git clone https://github.com/mrshanshuvo/gram2city-backend.git
cd gram2city-backend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` file and provide the required configuration values.

### Development Server

```bash
npm run dev
```

The default development server runs on the configured port.

For the default configuration:

```text
http://localhost:5000
```

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

Additional database and utility scripts may be available in the project.

## Frontend Integration

The backend is consumed by the Gram2City frontend.

```text
gram2city
     │
     │ REST API
     ▼
gram2city-backend
     │
     ├── MongoDB
     ├── Firebase
     ├── Stripe
     ├── Cloudinary
     └── Socket.IO
```

## Real-Time Communication

Socket.IO is included for real-time application functionality.

This allows supported features to communicate with connected clients without relying exclusively on traditional request-response flows.

## Authentication

The backend integrates with Firebase Admin for server-side authentication and also includes JWT and bcrypt-based authentication infrastructure.

Authentication and authorization should be handled through the appropriate protected routes and middleware.

## Payments

Stripe is integrated for payment-related functionality.

Payment credentials and webhook secrets must be stored securely through environment variables.

## File & Media Services

Cloudinary is used for cloud-based media management where required by the application.

## Database

The application uses:

```text
MongoDB
   │
   └── Mongoose
```

Mongoose provides schema-based data modeling and database interaction for the backend modules.

## Project Structure

```text
gram2city-backend/
├── src/
│   ├── config/
│   ├── db/
│   ├── middleware/
│   ├── modules/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── finance/
│   │   ├── parcel/
│   │   ├── public/
│   │   ├── rider/
│   │   ├── support/
│   │   └── user/
│   ├── scripts/
│   ├── socket/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

The application uses a centralized global error handler to provide consistent API error responses and prevent duplicated error-handling logic across individual modules.

## Code Quality

The project uses:

* ESLint
* Prettier
* Husky
* lint-staged

These tools help maintain consistent code quality and formatting across the backend.

## Project Status

Active development.

## License

This project is licensed under the MIT License.

## Author

**Shahid Hasan Shuvo**

Full Stack Developer
