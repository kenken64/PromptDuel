# Prompt Duel - API Endpoints Reference

## Base URL

```
http://localhost:3000
```

---

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Unprotected Endpoints (Public)

### Root & Health

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/` | Root - returns API name |
| 2 | GET | `/health` | Health check |

### Auth (Public)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 3 | POST | `/auth/register` | Register new user |
| 4 | POST | `/auth/login` | Login |
| 5 | POST | `/auth/forgot-password` | Request password reset email |
| 6 | POST | `/auth/reset-password` | Reset password with token |

### Legacy Data Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| 7 | GET | `/users` | List all users |
| 8 | GET | `/prompts` | List all prompts |
| 9 | GET | `/duels` | List all duels |

### Leaderboard

| # | Method | Path | Description |
|---|--------|------|-------------|
| 10 | GET | `/leaderboard` | Full leaderboard |
| 11 | GET | `/leaderboard/:challenge` | Leaderboard by challenge (1 or 2) |
| 12 | POST | `/leaderboard` | Save leaderboard entry |

### Evaluation

| # | Method | Path | Description |
|---|--------|------|-------------|
| 13 | POST | `/evaluate-player` | Evaluate a single player's workspace |
| 14 | POST | `/evaluate` | Evaluate both players |

### Challenge Prompts

| # | Method | Path | Description |
|---|--------|------|-------------|
| 15 | GET | `/challenge-prompts/:challenge` | Get sample prompts for a challenge |

**Total Unprotected: 15 endpoints**

---

## Protected Endpoints (Require Bearer Token)

### Auth (Protected)

| # | Method | Path | Auth Mechanism | Description |
|---|--------|------|----------------|-------------|
| 16 | POST | `/auth/logout` | getUserFromToken | Logout, cleanup rooms |
| 17 | GET | `/auth/me` | getUserFromToken | Get current user info |
| 18 | POST | `/auth/change-password` | getUserFromToken | Change password |

### Rooms

| # | Method | Path | Auth Mechanism | Description |
|---|--------|------|----------------|-------------|
| 19 | GET | `/rooms/` | getUserFromToken | List non-finished rooms |
| 20 | POST | `/rooms/` | getUserFromToken | Create a new room |
| 21 | GET | `/rooms/:code` | getUserFromToken | Get room details |
| 22 | POST | `/rooms/:code/join` | getUserFromToken | Join room as player |
| 23 | POST | `/rooms/:code/spectate` | getUserFromToken | Join room as spectator |
| 24 | POST | `/rooms/:code/ready` | getUserFromToken | Toggle ready status |
| 25 | POST | `/rooms/:code/start` | getUserFromToken | Start game (host only) |
| 26 | POST | `/rooms/:code/leave` | getUserFromToken | Leave room |
| 27 | POST | `/rooms/:code/finish` | getUserFromToken | Mark room as finished |
| 28 | POST | `/rooms/:code/provider` | getUserFromToken | Set AI provider/model |
| 29 | POST | `/rooms/:code/penalty` | getUserFromToken | Update penalty score |
| 30 | POST | `/rooms/:code/results` | getUserFromToken | Save game results |
| 31 | DELETE | `/rooms/:code` | getUserFromToken | Delete room (host only) |

### Chat

| # | Method | Path | Auth Mechanism | Description |
|---|--------|------|----------------|-------------|
| 32 | GET | `/chat/:roomCode` | getUserFromToken + room member | Get chat messages |
| 33 | POST | `/chat/:roomCode` | getUserFromToken + room member | Send chat message |

**Total Protected: 18 endpoints**

---

## WebSocket Endpoint

### `WS /ws/room`

Connection is unauthenticated initially. Client must send `auth` message with JWT token first.

| Message Type | Auth Required | Role Required | Description |
|--------------|--------------|---------------|-------------|
| `auth` | JWT token | None | Authenticate connection |
| `join-room` | Authenticated | Room member | Join room's real-time channel |
| `leave-room` | Authenticated | In a room | Leave room's real-time channel |
| `ready-toggle` | Authenticated | Player | Toggle ready status |
| `chat-message` | Authenticated | In a room | Send chat message |
| `game-start` | Authenticated | Host | Start the game |
| `game-state` | Authenticated | In a room | Broadcast game state |
| `terminal-output` | Authenticated | Player | Forward terminal output |
| `ping` | Authenticated | None | Heartbeat |
| `game-end` | Authenticated | In a room | End the game |

---

## Request/Response Examples

### POST /auth/register

```json
// Request
{ "username": "testuser", "email": "test@example.com", "password": "password123" }

// Response (201)
{ "success": true, "user": { "id": 1, "username": "testuser", "email": "test@example.com" }, "token": "eyJ..." }
```

### POST /auth/login

```json
// Request
{ "username": "testuser", "password": "password123" }

// Response (200)
{ "success": true, "user": { "id": 1, "username": "testuser", "email": "test@example.com" }, "token": "eyJ..." }
```

### POST /rooms/ (Protected)

```json
// Request
{ "challenge": 1, "timerMinutes": 20 }

// Response (200)
{ "success": true, "room": { "id": 1, "code": "ABC123", "challenge": 1, "status": "waiting", ... } }
```

### GET /rooms/ (Protected)

```json
// Response (200)
{ "success": true, "rooms": [{ "id": 1, "code": "ABC123", "hostUsername": "testuser", "spectatorCount": 0, ... }] }
```

---

## Summary

| Category | Count |
|----------|-------|
| Unprotected HTTP | 15 |
| Protected HTTP | 18 |
| WebSocket messages | 10 |
| **Total** | **43** |
