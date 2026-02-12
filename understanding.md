# Prompt Duel - Codebase Understanding

## 1. Project Overview
**Prompt Duel** is a competitive multiplayer game where two players battle to write the most efficient prompts for AI code generation. Players are given a coding challenge and must instruct the AI to solve it using as few prompts as possible.

## 2. Technology Stack
The project is a monorepo divided into three main services:

### **Frontend** (`/frontend`)
*   **Framework**: React 18 + Vite + TypeScript
*   **Styling**: NES.css (retro gaming aesthetic) + Tailwind CSS + Radix UI
*   **State Management**: React Context (`GameContext`, `RoomContext`, `AuthContext`)
*   **Routing**: React Router DOM v6
*   **Communication**: HTTP (Backend) + WebSockets (Terminal Server)

### **Backend** (`/backend`)
*   **Runtime**: Bun
*   **Framework**: ElysiaJS
*   **Database**: SQLite with Drizzle ORM
*   **Role**: Handles user authentication, room management, matchmaking, leaderboards, and solution evaluation.

### **AI Code Server** (`/ai-code-server`)
*   **Runtime**: Node.js
*   **Key Libraries**:
    *   `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`: Multi-provider AI SDKs.
    *   `ws`: WebSocket server for real-time communication.
*   **Role**: Receives prompts from players, generates code via AI provider APIs (Anthropic, OpenAI, Google), writes code to player workspaces, and streams output to the frontend in real-time.

## 3. Architecture & Data Flow

```mermaid
graph TD
    User[User Browser] -->|HTTP/REST| Backend[Backend API :3000]
    User -->|WebSocket| Backend
    User -->|WebSocket| ACS[AI Code Server :3001]

    Backend -->|Read/Write| DB[(SQLite Database)]

    ACS -->|API Call| AI[AI Providers]
    AI -->|Anthropic/OpenAI/Google| Response[Generated Code]
    ACS -->|Write Files| Workspace[./workspaces/Player_Challenge]
    
    Backend -->|Read Files| Workspace
```

1.  **Rooms**: Players allow the Backend to match them into a room.
2.  **Session Start**: The Frontend connects to the AI Code Server via WebSocket to start a session.
3.  **Game Loop**:
    *   Players submit a prompt text.
    *   The ACS sends the prompt to the selected AI provider API.
    *   Generated code is written to the workspace and output is streamed back to the client.
4.  **Evaluation**: The Backend reads the files generated in the workspace to score the solution.

## 4. Key Directories & Files

### Root
*   `scripts/`: Automation scripts for starting/stopping all services (Windows/Unix).
*   `workspaces/`: Dynamic directory where player projects are generated.
*   `docker-compose.yml`: Container orchestration.

### Backend (`/backend/src`)
*   `index.ts`: Main API entry point and routes.
*   `ws/roomServer.ts`: WebSocket logic for room coordination.
*   `evaluate.ts`: Logic to check player solutions against test cases.
*   `db/schema.ts`: Drizzle ORM schema definitions (Users, Prompts, Duels, Leaderboard).

### AI Code Server (`/ai-code-server`)
*   `index.js`: The core logic.
    *   Manages WebSocket sessions per player.
    *   Routes prompts to the selected AI provider (Anthropic/OpenAI/Google).
    *   Writes generated code to player workspaces.
    *   Streams output to spectators.
*   `providers/`: Multi-provider AI integration layer.
    *   `ProviderFactory.js`: Factory pattern for provider instantiation.
    *   `AnthropicProvider.js`, `OpenAIProvider.js`, `GoogleProvider.js`: Provider implementations.

### Frontend (`/frontend/src`)
*   `pages/GamePage.tsx`: The main game UI orchestration.
*   `contexts/GameContext.tsx`: "God object" managing the complex game state, timers, and socket events.
*   `components/UnifiedPromptArea.tsx`: The mechanism for submitting prompts.
*   `gameRules.ts`: Client-side scoring logic display.

## 5. Game Mechanics

### Workspaces
The system isolates players by creating unique directories in `/workspaces/{player_name}_challenge{id}/`.
Each workspace is initialized with:
*   `package.json`: Basic Node.js project setup.
*   `CLAUDE.md`: Instructions for Claude on how to behave (e.g., "Only implement what is asked").
*   `index.js`: A starter file.

### Interacting with AI Providers
The AI Code Server uses a provider abstraction layer to send prompts to the selected AI provider API. Each provider (Anthropic Claude, OpenAI GPT, Google Gemini) implements a common interface for code generation. The server sends the player's prompt along with challenge context as a system prompt, receives generated code, and writes it to the player's workspace.

### Scoring
*   **Base Score**: Calculated by the backend (`evaluate.ts`) based on:
    *   Functionality (40%)
    *   Algorithm Efficiency (20%)
    *   Error Handling (15%)
    *   Code Quality (15%)
    *   CLI Implementation (10%)
*   **Multiplier**: A counter-intuitive mechanic where **using MORE prompts is better**.
    *   Rationale: Encourages iterative refinement over "lucky" one-shotting or copy-pasting.
    *   7 Prompts (Max): **1.0x** (Full Score)
    *   1 Prompt: **0.3x** (Severe Penalty)
    *   *Formula*: `FinalScore = BaseScore * Multiplier(promptsUsed)`

## 6. Setup & Running

**Prerequisites**: Node.js v20+, Bun, Anthropic API Key.

**Start All Services**:
*   **Windows**: `.\scripts\start-all.ps1`
*   **Mac/Linux**: `./scripts/start-all.sh`

**Environment Variables**:
*   `ANTHROPIC_API_KEY`: Required for Anthropic provider (at least one provider API key needed).

## 7. Synchronization & Networking

Prompt Duel uses a **Three-Layer Synchronization details** architecture to manage the complex state between two players and spectators.

### 1. Room & Presence (Backend WebSocket)
**Endpoint**: `/ws/room`
**Role**: Manages "Lobby" state.
*   **Events**: `join-room`, `player-joined`, `ready-toggle`, `game-start`.
*   **Mechanism**: The Backend maintains a map of rooms and connected clients. It broadcasts presence updates to all connected clients in a room. This is how players know when their opponent has joined or is ready.

### 2. Game Logic (Supabase Realtime)
**Endpoint**: `supbabase.channel()`
**Role**: Manages "Game" state (Turns, Scores, Messages).
*   **Events**: Turn switching (`TURN:player1`), Score updates (`SCORE_UPDATE`), Game over (`GAME_END`).
*   **Mechanism**: The application leverages `GameContext` to subscribe to Supabase channels. Crucial game state changes (like passing the turn after a prompt is processed) are synced via system messages in the database, which Supabase pushes to all clients.
    *   *Why?* This ensures a persistent log of the game state and allows spectators to "replay" the logic by reading the message history.

### 3. AI Code Generation (AI Code Server WebSocket)
**Endpoint**: `ws://localhost:3001`
**Role**: Manages real-time AI code generation.
*   **Players**: Connect to start a session (`start-session`) with their selected AI provider.
    *   Input: Frontend -> ACS -> AI Provider API
    *   Output: AI Provider API -> ACS -> Frontend
*   **Spectators**: Connect to ACS via `spectate-session`.
    *   The ACS broadcasts generation output from active sessions to any connected spectators.

### 4. Connection Lifecycle (Server Cleanup)
To prevent memory leaks and zombie rooms, the Backend runs a background job every **5 minutes**:
*   **Stale Clients**: Removes any client whose WebSocket `readyState` is not `OPEN`.
*   **Empty Rooms**: Deletes any room that has 0 players and 0 spectators.

## 8. Game Scenarios & Race Conditions

The following diagrams illustrate how the system handles complex multiplayer scenarios.

### Scenario A: Both Players Complete All 7 Prompts
When both players exhaust their allowed prompts (7 max), the game automatically triggers the end-game evaluation.

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant P2 as Player 2
    participant G as GameContext (P1/P2)
    participant S as Supabase (DB)
    participant B as Backend (API)

    Note over P1,P2: Turn-based loop continues...
    
    P1->>G: Submits Prompt #7
    G->>S: Broadcast "Pulse: Prompt #7"
    G->>P1: "You have used all prompts!"
    Note right of P1: P1 enters "Ended" state
    
    S->>P2: Sync "P1 used 7 prompts"
    
    P2->>G: Submits Prompt #7
    G->>S: Broadcast "Pulse: Prompt #7"
    G->>P2: "You have used all prompts!"
    Note right of P2: P2 enters "Ended" state

    rect rgb(240, 240, 240)
    Note over G: Check: Both players ended?
    G->>S: Broadcast "GAME_END"
    G->>B: POST /evaluate (P1 vs P2)
    B->>B: Run Test Suites
    B-->>G: Return Scores & Winner
    G->>S: Broadcast "RESULTS:{...}"
    G->>P1: Navigate to /results
    G->>P2: Navigate to /results
    end
```

### Scenario B: Concurrent "End Early" (Race Condition)
If both players decide to "End Duel" at nearly the same time, the system uses the first processed `GAME_END` message as the source of truth.

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant P2 as Player 2
    participant S as Supabase
    participant B as Backend

    P1->>S: Send "GAME_END" (Timestamp: T1)
    P2->>S: Send "GAME_END" (Timestamp: T2)
    
    par P1 Processing
        S->>P1: Receive "GAME_END" (from P1)
        Note over P1: "I ended it. I am Host."
    and P2 Processing
        S->>P2: Receive "GAME_END" (from P1) 
        Note over P2: "System ended it. Navigate."
    end
    
    Note over P1,P2: Synchronization
    P1->>B: POST /evaluate
    B-->>P1: Results
    P1->>S: Broadcast "RESULTS"
    S->>P2: Receive "RESULTS"
    
    Note over P1,P2: Both see consistent Final Score
```

### Scenario C: Disconnection Handling
What happens if a player disconnects mid-turn?

```mermaid
stateDiagram-v2
    [*] --> Connected
    Connected --> Disconnected: WS Connection Lost
    Disconnected --> Reconnecting: Auto-retry (3s)
    Reconnecting --> Connected: Success
    Reconnecting --> Offline: Max retries exhausted
    
    state Connected {
        [*] --> Syncing
        Syncing --> Ready: Receive State from Supabase
    }
```

### Scenario D: Host Forfeit (Early Exit)
If the Host (Player 1) manually ends the game *before* Player 2 has finished their prompts, it is treated as a forfeit.

```mermaid
sequenceDiagram
    participant P1 as Player 1 (Host)
    participant P2 as Player 2
    participant G as GameContext
    participant S as Supabase

    P1->>G: Clicks "End Duel"
    alt Player 2 is NOT Finished
        G->>G: Set Winner = Player 2 (Forfeit)
        G->>S: Broadcast "Score Update: P1(0) vs P2(Win)"
        G->>S: Broadcast "GAME_END: Forfeit"
        Note right of P1: Host forfeited!
    else Player 2 IS Finished
        G->>G: Normal Evaluation (Score vs Score)
    end
```

### Scenario E: Time Expiration (Timeout)
Global timer synchronization is critical. The game monitors `timeLeft` on both clients.

```mermaid
sequenceDiagram
    participant T as Timer (Client Side)
    participant G as GameContext
    participant S as Supabase
    participant B as Backend

    T->>T: Tick... 00:00
    T->>G: handleTimeUp()
    G->>S: Broadcast "GAME_END: Timeout"
    G->>B: POST /evaluate
    Note over G: Forces prompt submissions to close
```

### 9. Sync "Processing" State (Turn Integrity)
To prevent prompt flooding or turn-skipping, the system enforces a strict "Processing" lock.

*   **Trigger**: `processing-started` event from AI Code Server.
*   **Action**: 
    1.  Sets `isProcessing = true` locally.
    2.  Broadcasts `Claude is working...` via Supabase.
    3.  Opponent receives message -> Sets `opponentProcessing = true` -> Disables Input.
    4.  **Result**: Neither player can submit until `processing-complete` is received.
