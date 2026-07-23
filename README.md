# Smart AI Library Management System

An enterprise-grade Digital Library Management System featuring automated AI cataloging, barcode/QR generation, SMS alerts, circulation ledger automation, and fine calculation logs.

---

## 📸 Application Preview
Screenshots of the dashboard, analytics modules, and book catalogue can be found inside the `screenshots/` directory.

---

## 🛠️ Technical Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, Python 3.10+
- **Frontend**: React 18, Vite, CSS Grid & Flexbox, Design Token Architecture
- **Security**: JWT tokens, OAuth2, Request Rate Limiting, HTTP security headers, CORS guards

---

## 📁 Directory Structure
```
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/             # Security middleware, Rate limiters, JWT utils
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Business logic layer
│   │   └── models/           # MongoDB Pydantic Schemas
│   └── main.py               # Main entrypoint
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Layout items, Enterprise Primitive Library
│   │   ├── pages/            # View components (Dashboard, Books, Students)
│   │   └── services/         # Axios API connection handlers
│   └── vite.config.js
└── docker-compose.yml        # Docker Deployment Specs
```

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)
Create a `.env` file in the backend root directory with the following variables:
```ini
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=smart_library
SECRET_KEY=supersecretjwtkeychangeinproduction
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DEBUG=True
```

---

## 🚀 Setup & Local Installation

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed default database admin:
   ```bash
   python create_admin.py
   ```
5. Start uvicorn development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📖 API Documentation
Once the backend is running, interactive API documentation is available at:
- **Interactive Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternate Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🐳 Docker Deployment
To spin up the entire application, including the MongoDB instance, backend API server, and React client using Docker Compose:
```bash
docker-compose up --build
```
This maps the client server to `http://localhost:5173` and the API service to `http://localhost:8000`.
