# Contacts Manager API

A backend CRUD application for managing contacts, built using Node.js, Express, and SQLite.  
This project implements a clean RESTful API with validation, persistence, pagination, sorting, and automated tests.

---

## Features

- Create, read, update, and delete contacts
- Input validation:
  - Required fields (name, email, phone)
  - Email format validation
  - Phone number length validation
  - Unique email constraint
- Pagination, sorting, and search support
- SQLite database for persistence
- RESTful API design
- Automated tests using Jest and Supertest
- Clear error handling and responses

---

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite
- **Testing:** Jest, Supertest

---

## Project Structure

contact-manager-kyross/
├── server.js
├── server.test.js
├── package.json
├── package-lock.json
└── README.md

yaml
Copy code

---

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Install dependencies
```bash
npm install
Run the server
bash
Copy code
npm start
The server will start at:

arduino
Copy code
http://localhost:3000
Example Requests
Get all contacts
bash
Copy code
curl http://localhost:3000/api/contacts
Create a contact
bash
Copy code
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
Running Tests
bash
Copy code
npm test