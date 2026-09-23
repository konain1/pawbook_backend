# 🐾 Pawbook Backend API

A full-featured social media backend for pet lovers, built with **Node.js**, **Express**, **MongoDB**, and **Socket.io**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
  - [Authentication](#authentication)
  - [User](#user)
  - [Profile](#profile)
  - [Posts](#posts)
  - [Friends](#friends)
  - [Chat](#chat)
- [Socket.io Events](#-socketio-events)
- [Rate Limiting](#-rate-limiting)
- [Caching & Cookies](#-caching--cookies)
- [Git Branch Strategy](#-git-branch-strategy)

---

## ✨ Features

- **Authentication** — Register & login with JWT tokens (stored in secure HTTP-only cookies) and bcrypt password hashing
- **User Management** — Search users, view profiles, follow/unfollow
- **Profile** — Update username, email, password, bio, and avatar (Cloudinary upload)
- **Posts** — Create, read, update, delete posts with image uploads to Cloudinary
- **Likes & Comments** — Like/unlike posts and add comments
- **Friend System** — Send, accept, reject friend requests and remove friends
- **Real-time Chat** — Socket.io powered messaging between friends with typing indicators
- **Rate Limiting** — Protection against spam and abuse on REST and WebSocket
- **Caching** — In-memory caching for GET requests to optimize performance

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express** | Web framework |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Cloudinary** | Image hosting (avatars & posts) |
| **Multer** | File upload handling |
| **Socket.io** | Real-time chat |
| **express-rate-limit** | API rate limiting |
| **node-cache** | In-memory API caching |
| **cookie-parser** | HTTP-only cookie management |
| **CORS** | Cross-origin support |
| **dotenv** | Environment variables |

---

## 📁 Project Structure

```text
backend/
├── index.js                          # Entry point — Express + Socket.io server
├── package.json
├── .env                              # Environment variables (not in git)
├── .gitignore
└── src/
    ├── config/
    │   ├── cloudinary.js             # Cloudinary SDK configuration
    │   └── cookie.js                 # Cookie configuration
    ├── controllers/
    │   ├── auth.controller.js        # Register, login, logout logic
    │   ├── chat.controller.js        # Chat messages & conversations
    │   ├── friend.controller.js      # Friend requests & management
    │   ├── post.controller.js        # CRUD posts, likes, comments
    │   └── profile.controller.js     # Profile get & update
    ├── middlewares/
    │   ├── cache.js                  # Caching middleware
    │   ├── rateLimiter.js            # Rate limit configurations
    │   ├── upload.js                 # Multer memory storage middleware
    │   └── verifyToken.js            # JWT authentication middleware
    ├── models/
    │   ├── friendRequest.model.js    # Friend request schema
    │   ├── message.model.js          # Chat message schema
    │   ├── post.model.js             # Post schema
    │   └── user.model.js             # User schema
    ├── routes/
    │   ├── auth.route.js             # /api/auth
    │   ├── chat.route.js             # /api/chat
    │   ├── friend.route.js           # /api/friends
    │   ├── post.route.js             # /api/posts
    │   ├── profile.route.js          # /api/profile
    │   └── user.route.js             # /api/users
    └── socket/
        └── socket.js                 # Socket.io event handlers
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Cloudinary** account ([sign up free](https://cloudinary.com))

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd pawbook/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root of the backend directory:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/pawbook
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
```

### Step 4: Start the Server

```bash
# Development (with auto-reload)
npx nodemon index.js

# Production
node index.js
```

The server will start at `http://localhost:8000`

### Step 5: Verify

```bash
curl http://localhost:8000
# Response: {"status":"ok","message":"Pawbook API is running 🐾"}
```

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/pawbook` |
| `JWT_SECRET` | Secret key for JWT tokens | `my_super_secret_key` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `dl8o1voak` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `941656393716984` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `RftdDzYswtPeIpgVwAC7u_HUsZ0` |
| `CLIENT_URL` | Frontend URL (for CORS & Socket.io) | `http://localhost:3000` |

---

## 📡 API Endpoints

> All protected routes require the header:  
> `Authorization: Bearer <your_jwt_token>` OR an HTTP-only cookie containing the token.

### Authentication

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register a new user | `{ username, email, password }` |
| `POST` | `/api/auth/login` | Login & get token | `{ email, password }` |
| `POST` | `/api/auth/logout` | Logout & clear cookie | |

**Example — Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'
```

**Response:**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "_id": "...", "username": "john", "email": "john@example.com" }
}
```

---

### User

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/users/me` | Get logged-in user's profile | ✅ |
| `GET` | `/api/users/profile/:id` | Get any user's profile | ✅ |
| `PUT` | `/api/users/update` | Update bio, avatar, username | ✅ |
| `PUT` | `/api/users/follow/:id` | Follow a user | ✅ |
| `PUT` | `/api/users/unfollow/:id` | Unfollow a user | ✅ |
| `GET` | `/api/users/search?q=keyword` | Search users by username | ✅ |

---

### Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/profile` | Get your profile | ✅ |
| `PUT` | `/api/profile` | Update profile (form-data) | ✅ |

**PUT `/api/profile`** accepts `form-data`:
- `username` (Text) — optional
- `email` (Text) — optional, checks for duplicates
- `password` (Text) — optional, min 6 chars
- `bio` (Text) — optional
- `avatar` (File) — optional, uploads to Cloudinary

---

### Posts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/posts` | Create post (form-data: `image` + `caption`) | ✅ |
| `GET` | `/api/posts` | Get all posts (feed) | ✅ |
| `GET` | `/api/posts/:id` | Get a single post | ✅ |
| `GET` | `/api/posts/user/:userId` | Get posts by a user | ✅ |
| `PUT` | `/api/posts/:id` | Update post (form-data) | ✅ |
| `PUT` | `/api/posts/:id/like` | Like / unlike a post | ✅ |
| `POST` | `/api/posts/:id/comment` | Add a comment `{ text }` | ✅ |
| `DELETE` | `/api/posts/:id` | Delete a post (owner only) | ✅ |

**Example — Create Post:**
```bash
curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg" \
  -F "caption=My cute pet 🐾"
```

---

### Friends

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/friends/request/:userId` | Send friend request | ✅ |
| `PUT` | `/api/friends/accept/:requestId` | Accept friend request | ✅ |
| `PUT` | `/api/friends/reject/:requestId` | Reject friend request | ✅ |
| `DELETE` | `/api/friends/remove/:userId` | Remove a friend | ✅ |
| `GET` | `/api/friends` | List all friends | ✅ |
| `GET` | `/api/friends/requests` | List pending requests received | ✅ |
| `GET` | `/api/friends/sent` | List sent friend requests | ✅ |

**Friend Request Flow:**
1. User A sends request → `POST /api/friends/request/<userB_id>`
2. User B sees pending requests → `GET /api/friends/requests`
3. User B accepts → `PUT /api/friends/accept/<request_id>`
4. Both are now friends! 🎉

---

### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/chat` | List all conversations (with unread count) | ✅ |
| `GET` | `/api/chat/:friendId` | Get messages with a friend | ✅ |
| `POST` | `/api/chat/:friendId` | Send a message `{ text }` | ✅ |
| `PUT` | `/api/chat/read/:friendId` | Mark messages as read | ✅ |

> **Note:** Only friends can chat with each other.

---

## 🔌 Socket.io Events

### Connection

Connect with JWT token:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
  auth: { token: 'your_jwt_token' }
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `sendMessage` | `{ receiverId, text }` | Send a message to a friend |
| `typing` | `receiverId` | Notify friend you're typing |
| `stopTyping` | `receiverId` | Stop typing notification |
| `markRead` | `senderId` | Mark messages from user as read |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `newMessage` | Message object | New message received |
| `messageSent` | Message object | Message send confirmation |
| `messageError` | `{ message }` | Message send failed |
| `userTyping` | `{ userId }` | A friend is typing |
| `userStopTyping` | `{ userId }` | Friend stopped typing |
| `messagesRead` | `{ readBy }` | Messages were read |
| `userOnline` | `userId` | A user came online |
| `userOffline` | `userId` | A user went offline |
| `rateLimited` | `{ message }` | Too many events, slow down |

---

## 🛡 Rate Limiting

### REST API Limits

| Route | Max Requests | Time Window |
|-------|-------------|-------------|
| All `/api/*` | 100 | 15 minutes |
| `/api/auth` | 10 | 15 minutes |
| `/api/posts` | 10 | 1 hour |
| `/api/friends` | 20 | 1 hour |
| `/api/chat` | 30 | 1 minute |

### Socket.io Limits

| Event | Max Per Minute |
|-------|---------------|
| `sendMessage` | 30 |
| `typing` / `stopTyping` | 60 |
| `markRead` | 30 |

When rate limited:
- **REST** → Returns `429 Too Many Requests`
- **Socket** → Emits `rateLimited` event

---

## ⚡ Caching & Cookies

### Cookies
- **Secure Authentication:** JSON Web Tokens (JWT) are securely stored in HTTP-only cookies to prevent XSS attacks.
- **CSRF Protection:** Cookies have the `SameSite=strict` flag.
- **Automatic Handling:** `cookie-parser` handles parsing cookies for API authentication seamlessly alongside the standard `Authorization` header.

### Caching
- **Node-Cache:** Uses in-memory caching to optimize repetitive GET requests.
- **User Specific:** Cache keys are tied to specific user IDs to prevent leaking personal information across different users.
- **Automatic Expiration:** Cached records expire automatically to ensure data freshness.

---

## 🌿 Git Branch Strategy

| Branch | Description |
|--------|-------------|
| `main` | Stable production code |
| `dev` | Development branch (all features merged here) |
| `authentication` | Auth routes, controllers, middleware |
| `post` | Post CRUD, likes, comments, Cloudinary uploads |
| `profile` | Profile update with image upload |
| `friend` | Friend request system |
| `socketIO` | Real-time chat with Socket.io |
| `ratelimit` | Rate limiting for REST & Socket |
| `caching` | HTTP-only cookie tokens and caching |
| `readme.md` | Documentation |

**Workflow:**
1. Create feature branch from `dev` → `git checkout -b feature-name`
2. Develop and commit on the feature branch
3. Merge into `dev` → `git checkout dev && git merge feature-name`
4. When stable, merge `dev` into `main`

---

## 📝 License

ISC

---

Built with ❤️ for Pawbook 🐾
