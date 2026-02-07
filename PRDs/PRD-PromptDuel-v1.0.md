# Product Requirements Document (PRD)
# Prompt Duel - Competitive Prompt Engineering Game

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Released
**Author:** Development Team

---

## 1. Executive Summary

### 1.1 Product Overview
Prompt Duel is a real-time multiplayer competitive game that tests players' prompt engineering skills. Two players compete head-to-head, each with their own Claude Code terminal session, racing to craft effective prompts that instruct Claude AI to build working solutions to coding challenges.

### 1.2 Vision Statement
To create an engaging, educational platform where developers can improve their prompt engineering skills through competitive gameplay while having fun.

### 1.3 Target Audience
- Software developers interested in AI/LLM technologies
- Prompt engineering enthusiasts
- Teams looking for interactive learning experiences
- Hackathon participants and coding competition organizers

---

## 2. Problem Statement

### 2.1 Current Challenges
- Learning prompt engineering is often a solitary, trial-and-error process
- No gamified platforms exist specifically for competitive prompt crafting
- Difficult to measure and compare prompt engineering skills objectively
- Limited opportunities for real-time collaborative learning

### 2.2 Solution
Prompt Duel addresses these challenges by providing:
- A competitive, gamified environment for prompt engineering practice
- Real-time feedback through live Claude Code terminal sessions
- Objective scoring based on solution quality and prompt efficiency
- Multiplayer experience that encourages learning through competition

---

## 3. Product Features

### 3.1 User Authentication System

#### 3.1.1 Registration
- **Description:** New users can create accounts with username, email, and password
- **Requirements:**
  - Unique username validation
  - Email format validation
  - Password hashing with bcrypt
  - JWT token generation upon successful registration

#### 3.1.2 Login/Logout
- **Description:** Secure authentication flow
- **Requirements:**
  - JWT-based session management
  - Token expiration handling
  - Secure logout with token invalidation

### 3.2 Room System

#### 3.2.1 Room Creation
- **Description:** Authenticated users can create game rooms
- **Requirements:**
  - 6-character unique room codes
  - Challenge selection (Challenge 1 or 2)
  - Host privileges for room management
  - Room status tracking (waiting, playing, finished)

#### 3.2.2 Room Joining
- **Description:** Players can join existing rooms
- **Requirements:**
  - Join by room code
  - Automatic player slot assignment (Player 1 or Player 2)
  - Spectator mode for full rooms

#### 3.2.3 Ready System
- **Description:** Pre-game ready check
- **Requirements:**
  - Both players must mark ready
  - Only host can start the game
  - Real-time ready status updates via WebSocket

### 3.3 Game Mechanics

#### 3.3.1 Turn-Based Gameplay
- **Description:** Players alternate submitting prompts
- **Requirements:**
  - Player 1 always starts
  - Turn switches after prompt submission and Claude response
  - Visual indicators for current turn
  - Button states reflect turn ownership

#### 3.3.2 Prompt System
- **Description:** Players submit prompts to Claude Code
- **Requirements:**
  - Maximum 280 characters per prompt
  - Maximum 7 prompts per player
  - "End Prompts" option to finish early
  - Real-time prompt count tracking

#### 3.3.3 Scoring System
- **Description:** Performance-based scoring with efficiency multiplier
- **Requirements:**
  - Raw score from automated evaluation (0-100)
  - Multiplier based on prompts used:
    | Prompts | Multiplier |
    |---------|------------|
    | 1 | 0.3x |
    | 2 | 0.5x |
    | 3 | 0.7x |
    | 4 | 0.85x |
    | 5 | 0.9x |
    | 6 | 0.95x |
    | 7 | 1.0x |
  - Final Score = Raw Score × Multiplier

#### 3.3.4 Timer
- **Description:** Game time limit
- **Requirements:**
  - Configurable timeout (default 20 minutes)
  - Visual countdown display
  - Auto-evaluation when time expires

### 3.4 Claude Code Integration

#### 3.4.1 PTY Terminal Sessions
- **Description:** Each player gets isolated terminal environment
- **Requirements:**
  - Separate workspace directories per player
  - Real-time terminal output streaming
  - WebSocket-based communication
  - Session persistence during game

#### 3.4.2 Evaluation System
- **Description:** Automated solution assessment
- **Requirements:**
  - Category-based scoring for each challenge
  - Challenge 1 (BracketValidator):
    - Functionality/Test Cases (40%)
    - Algorithm Efficiency (20%)
    - Error Handling (15%)
    - Code Quality (15%)
    - CLI Implementation (10%)
  - Challenge 2 (QuantumHeist):
    - Algorithm Design (25%)
    - Data Structures (20%)
    - Game Mechanics (20%)
    - Code Quality (15%)
    - Complexity Analysis (10%)
    - Testing (5%)
    - Performance (3%)
    - Documentation (2%)

### 3.5 Chat System

#### 3.5.1 Room Chat
- **Description:** Real-time messaging in waiting room
- **Requirements:**
  - Supabase real-time integration
  - Message persistence
  - User identification
  - 500 character limit

#### 3.5.2 Game Messages
- **Description:** In-game event log
- **Requirements:**
  - System messages for game events
  - Judge announcements
  - Turn notifications
  - Prompt submissions display

### 3.6 Spectator Mode

#### 3.6.1 Spectator Features
- **Description:** Watch live games without participating
- **Requirements:**
  - Join as spectator when room is full
  - View both players' terminals
  - Read-only game view
  - Real-time score updates

### 3.7 Leaderboard

#### 3.7.1 Leaderboard Display
- **Description:** Global rankings
- **Requirements:**
  - Filter by challenge (All, Challenge 1, Challenge 2)
  - Display: rank, player name, score, grade, prompts used, date
  - Top 3 special icons
  - Auto-save after each game

### 3.8 Results Page

#### 3.8.1 Game Summary
- **Description:** Post-game results display
- **Requirements:**
  - Winner announcement
  - Side-by-side score comparison
  - Detailed evaluation breakdown by category
  - Sample prompts for learning
  - Return to lobby option

---

## 4. Technical Architecture

### 4.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Prompt Duel                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐ │
│  │  Frontend   │    │   Backend   │    │  Claude Code Server  │ │
│  │   (React)   │◄──►│  (Elysia)   │    │     (node-pty)       │ │
│  │  Port 5173  │    │  Port 3000  │    │     Port 3001        │ │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬───────────┘ │
│         │                  │                       │             │
│         │           ┌──────▼──────┐                │             │
│         │           │   SQLite    │                ▼             │
│         │           │  Database   │       ┌───────────────┐     │
│         │           └─────────────┘       │  Claude Code  │     │
│         │                                 │     CLI       │     │
│         │                  ┌──────────────┴───────────────┘     │
│         │                  │                                     │
│         │           ┌──────▼──────┐                              │
│         └──────────►│  Supabase   │◄─────────────────────────── │
│                     │  (Realtime) │                              │
│                     └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, NES.css, Tailwind CSS |
| Backend | Bun, Elysia, Drizzle ORM, SQLite |
| Real-time Sync | Supabase Realtime |
| Terminal | Node.js, WebSocket (ws), node-pty |
| AI | Claude Code CLI, Anthropic API |
| Deployment | Docker, Docker Compose, Railway |

### 4.3 Database Schema

```sql
-- Users table
users (id, username, email, password_hash, last_login_at, created_at)

-- Sessions table
sessions (id, user_id, token, expires_at, created_at)

-- Rooms table
rooms (id, code, host_id, challenge, status, player1_id, player2_id,
       player1_ready, player2_ready, created_at)

-- Room spectators
room_spectators (id, room_id, user_id, joined_at)

-- Chat messages
chat_messages (id, room_id, user_id, message, created_at)

-- Leaderboard
leaderboard (id, player_name, challenge, score, max_score, percentage,
             grade, prompts_used, created_at)

-- Challenge prompts (sample answers)
challenge_prompts (id, challenge, prompt_number, title, content, created_at)
```

---

## 5. User Flows

### 5.1 New User Flow
1. Land on homepage
2. Click "Get Started Free"
3. Register with username/email/password
4. Auto-login and redirect to lobby
5. Create or join a room

### 5.2 Game Flow
1. Create room and select challenge
2. Share room code with opponent
3. Both players mark ready
4. Host starts the game
5. Players alternate submitting prompts
6. Claude Code executes prompts in real-time
7. Game ends when:
   - Both players end prompts, OR
   - Timer expires, OR
   - Host ends duel (forfeit rules apply)
8. Automated evaluation runs
9. Results displayed with winner
10. Scores saved to leaderboard

### 5.3 Spectator Flow
1. Enter room code or click "Watch Live" on playing room
2. Join as spectator
3. View both terminals and scores
4. Chat with other spectators
5. See real-time game progress

---

## 6. UI/UX Requirements

### 6.1 Design System
- **Theme:** Retro gaming aesthetic (NES.css)
- **Colors:**
  - Primary: #92cc41 (green)
  - Secondary: #209cee (blue)
  - Error: #e76e55 (red)
  - Warning: #f7d51d (yellow)
  - Background: #0a0a12 (dark)

### 6.2 Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Fluid typography using clamp()

### 6.3 Animations
- Fade-in for page elements
- Slide animations for player cards
- Trophy bounce for winners
- Glow effects on interactive elements

---

## 7. Security Requirements

### 7.1 Authentication
- Password hashing with bcrypt (10 rounds)
- JWT tokens with expiration
- HTTP-only considerations for production

### 7.2 Input Validation
- XSS prevention
- SQL injection prevention via ORM
- Input length limits
- Rate limiting on API endpoints

### 7.3 WebSocket Security
- Origin validation
- Session-based authentication
- Message validation

---

## 8. Performance Requirements

### 8.1 Response Times
- API responses: < 200ms
- WebSocket latency: < 100ms
- Page load: < 3s

### 8.2 Scalability
- Support 100+ concurrent games
- Horizontal scaling via Docker
- Database connection pooling

---

## 9. Future Enhancements (v2.0)

### 9.1 Planned Features
- [ ] Tournament mode
- [ ] Custom challenge creation
- [ ] Team battles (2v2)
- [ ] Replay system
- [ ] Achievement system
- [ ] Social features (friends, invites)
- [ ] Mobile app
- [ ] Voice chat integration
- [ ] AI difficulty modes (vs Claude)

### 9.2 Technical Improvements
- [ ] Redis for session management
- [ ] PostgreSQL for production
- [ ] CDN for static assets
- [ ] Kubernetes deployment
- [ ] Monitoring and analytics

---

## 10. Success Metrics

### 10.1 Key Performance Indicators (KPIs)
- Daily Active Users (DAU)
- Games played per day
- Average session duration
- User retention rate
- Leaderboard participation rate

### 10.2 Quality Metrics
- API uptime: 99.9%
- Error rate: < 1%
- User satisfaction score: > 4.0/5.0

---

## 11. Appendix

### 11.1 Glossary
- **PTY:** Pseudo-terminal for simulating terminal sessions
- **Claude Code:** Anthropic's CLI tool for AI-assisted coding
- **Prompt Engineering:** The skill of crafting effective instructions for AI models

### 11.2 References
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [NES.css Framework](https://nostalgic-css.github.io/NES.css/)
- [Elysia Framework](https://elysiajs.com/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

*Document End*
