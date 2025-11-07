# 🏟️ Sigil Game-Theoretic Visualization Layer

A dynamic, sports-inspired visualization layer for the X402 Quantum Agent Gateway that transforms abstract micropayments into an engaging economic game.

## 🎯 Overview

Instead of just showing "transactions happened," the Sigil visualization narrates a **storyline of possession** around a single token (the Sigil), making agent economy dynamics visceral and memorable. Think of it as soccer/hockey meets blockchain economics.

## ✨ Features

### 🎮 Dynamic Live Play Mode

The system now supports fully randomized, continuous gameplay where agents behave according to strategic profiles:

- **Conservative agents** (85% pass, 15% shoot, 800ms hold)
- **Aggressive agents** (75% pass, 35% shoot, 500ms hold)
- **Balanced agents** (80% pass, 25% shoot, 650ms hold)
- **Playmaker agents** (90% pass, 20% shoot, 700ms hold)

Each game is unique with:
- Stochastic turnovers (budget exhaustion, policy violations)
- Dynamic shot attempts (60% success rate)
- Real-time possession tracking
- Goal celebrations and resets

### 📊 Possession Statistics

Per-agent metrics displayed in real-time:
- **Possession percentage** - Share of total touches
- **Touch count** - Number of times agent held the Sigil
- **Sparkline visualization** - Recent touch patterns
- **Current holder indicator** - Pulsing dot for active possession

### 🎙️ Sports Commentary Generator

Automatic play-by-play narration with:
- **Dual commentators** - Play-by-play announcer + analyst
- **Dynamic event detection** - Goals, shots, turnovers, passes
- **Export formats**:
  - Markdown scripts for documentation
  - SRT subtitles for video editing
  - JSON for programmatic use

### 🏃 Four Game Modes

1. **Classic Build-up** - Methodical possession ending in a goal
2. **Fast Break** - Rapid three-pass counter-attack
3. **Press Break** - High-pressure interception drill
4. **Live Play ⚡** - Continuous randomized gameplay (NEW!)

## 🚀 Usage

### Running a Live Game

Click the "Live Play ⚡" button in the dashboard, or use the API:

```bash
curl -X POST http://localhost:3000/api/telemetry/demo-run \
  -H "Content-Type: application/json" \
  -d '{"variant": "live", "durationMs": 20000}'
```

### Generating Commentary

Get a commentary script for recent gameplay:

```bash
# Markdown format
curl "http://localhost:3000/api/telemetry/commentary?variant=live&format=text"

# JSON format
curl "http://localhost:3000/api/telemetry/commentary?variant=live&format=json"

# SRT subtitles for video
curl "http://localhost:3000/api/telemetry/commentary?variant=live&format=srt" \
  -o sigil-commentary.srt
```

### Dashboard Features

The telemetry dashboard (`http://localhost:3000`) now includes:

1. **Sigil Passing Network** - SVG field visualization with:
   - Animated pass arcs between participants
   - Role-based node positioning (hub, agents, vendors, goal)
   - Current holder highlighting
   - Recent sequence timeline

2. **Possession Stats Grid** - Per-agent cards showing:
   - Live possession percentage
   - Touch count
   - Activity sparklines
   - Current holder status

3. **Commentary Download** - One-click access to generated scripts

## 🎨 Visualization Metaphor

### The Pitch
- **Agents** = Players (offensive)
- **Vendors** = Defenders/Service providers
- **Hub** = Referee/Facilitator
- **Goal** = Settlement endpoint
- **Sigil** = Ball/Token

### Event Types
- **Pass** = Standard token transfer
- **Shot** = Attempt at service completion
- **Goal** = Successful X402 settlement
- **Turnover** = Budget exhaustion or policy violation
- **Interception** = Unexpected possession change

## 📡 Technical Implementation

### New Components

1. **`lib/sigil-live-engine.ts`**
   - Random strategy engine
   - Continuous event generation
   - Configurable agent behaviors
   - Stochastic turnover simulation

2. **`lib/commentary-generator.ts`**
   - Play-by-play narration
   - Multi-format export (MD, JSON, SRT)
   - Event-driven commentary logic
   - Highlight detection

3. **`app/api/telemetry/commentary/route.ts`**
   - Commentary generation endpoint
   - Format negotiation
   - Real-time script creation

### Data Flow

```
Live Engine → Telemetry Events → Dashboard Visualization
     ↓              ↓                    ↓
Strategy AI    Event Stream         SVG Rendering
     ↓              ↓                    ↓
Agent Roles    Commentary Gen      Stats Tracking
```

## 🎬 Demo Video Script

The commentary generator produces ready-to-use scripts for demo videos:

```markdown
[0s] 🎙️ Welcome to the Quantum Agent Gateway sigil demonstration.
[2s] 🎙️ ⚡ Play has begun!
[5s] 🎙️ ⚡ Agent Beta takes the shot through Seller Delta!
[6s] 🎙️ 🔥 GOAL! What a finish!
[7s] 📊 Payment settled, service delivered.
```

## 🔑 Why This Matters

### Differentiation
Everyone else shows JSON logs or charts. This project shows a **game**.

### Engagement
Judges will remember "the soccer pitch of agents" long after they forget another CLI demo.

### Pedagogy
It teaches token flow and agent economies **in seconds**, not minutes.

### Extensibility
Later, the Sigil can map to **real X402 tokens**, not just synthetic drills.

## 📈 Statistics Example

A typical 20-second live game generates:
- **15-25 passes** between participants
- **3-5 shot attempts**
- **1-3 goals** scored
- **0-2 turnovers** from constraints
- **10+ unique agent interactions**

Every run is different, demonstrating the emergent complexity of the agent economy.

## 🛠️ Configuration

Customize live play behavior in `lib/sigil-live-engine.ts`:

```typescript
const config: LivePlayConfig = {
  durationMs: 20_000,      // 20 seconds
  agents: [...],            // 4 agents with strategies
  vendors: [...],           // 3 vendors
  hub: {...},              // Facilitator
  goal: {...},             // Settlement endpoint
  turnoverRate: 0.08,      // 8% turnover probability
}
```

## 📝 Commentary Format

Scripts include:
- **Title** - Variant identifier
- **Intro** - Context-setting opener
- **Lines** - Timestamped commentary with speaker/emphasis
- **Highlights** - Key statistics summary
- **Outro** - Wrap-up message

## 🎯 Future Enhancements

- [ ] Real-time streaming mode (WebSocket events)
- [ ] Replay system with scrubbing
- [ ] Team formations and tactics
- [ ] League/tournament mode
- [ ] Integration with actual X402 transactions
- [ ] 3D pitch visualization
- [ ] Crowd sound effects

## 📚 Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Demo Storyboard](../DEMO_STORYBOARD.md)
- [SigilNet Integration](../SIGILNET_INTEGRATION.md)
- [Telemetry Core Types](../packages/telemetry-core/src/types.ts)

---

**Built for the Solana X402 Hackathon** - Transforming agent telemetry into unforgettable gameplay. 🏆
