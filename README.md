# Restaurant Management System

A comprehensive full-stack restaurant management system built with React, Node.js, and MongoDB. This system helps restaurant owners and staff manage orders, reservations, menu items, customer feedback, and more.

## Features

### Customer Features
- Browse menu items and place orders
- Make and manage reservations
- Submit feedback and track order status
- User profile management
- Real-time order tracking

### Admin/Manager Features
- Dashboard with key metrics and analytics
- Order management and tracking
- Menu item management (add, edit, delete)
- Customer feedback and support management
- Staff management
- Reservation management
- Analytics and reporting

### Staff Features
- Order processing
- Table management
- Inventory tracking
- Customer support

## Tech Stack

### Frontend
- React.js
- TypeScript
- TailwindCSS
- React Router
- Axios
- React Query
- React Hook Form

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Socket.IO for real-time features

### DevOps & Tools
- Git for version control
- ESLint & Prettier for code formatting
- Jest for testing
- Docker support

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/restaurant-management.git
cd restaurant-management
```

2. Install dependencies for both frontend and backend
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Start the development servers
```bash
# Start backend server
cd backend
npm run dev

# Start frontend server (in a new terminal)
cd frontend
npm start
```

### Running with Docker
```bash
# Build and run containers
docker-compose up -d

# Stop containers
docker-compose down
```

## Project Structure
```
restaurant-management/
├── backend/                # Backend server code
│   ├── controllers/       # Request handlers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── utils/            # Utility functions
├── frontend/             # Frontend React code
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   └── public/           # Static files
└── utils/                # Shared utilities
```

## API Documentation

The API documentation is available at `/api/docs` when running the server. It includes detailed information about all available endpoints, request/response formats, and authentication requirements.



## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
