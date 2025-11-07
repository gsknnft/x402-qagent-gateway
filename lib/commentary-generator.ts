/**
 * Sports commentary generator for Sigil gameplay
 * Creates engaging play-by-play narration for demo videos
 */

import type { TelemetryEvent, SigilTransferEvent } from '../packages/telemetry-core/src/types'

export interface CommentaryLine {
  timestamp: number
  text: string
  emphasis: 'normal' | 'excited' | 'critical'
  speaker: 'play-by-play' | 'analyst'
}

export interface CommentaryScript {
  title: string
  intro: string
  outro: string
  lines: CommentaryLine[]
  highlights: string[]
}

const PLAY_BY_PLAY_OPENINGS = [
  "And we're underway!",
  "The sigil is in play!",
  "Here we go!",
  "Play has begun!",
]

const ANALYST_INSIGHTS = [
  "Notice how the agents are probing the vendor defenses",
  "This is textbook possession-based play",
  "The pace is picking up now",
  "They're finding the passing lanes",
  "Watch the spacing here",
  "Great field awareness",
]

const GOAL_CELEBRATIONS = [
  "GOAL! What a finish!",
  "IT'S IN! Magnificent execution!",
  "SCORES! The sigil finds the net!",
  "GOAL! Absolutely clinical!",
  "THEY'VE DONE IT! What a play!",
]

const SHOT_CALLS = [
  "Here comes the shot!",
  "They're lining up!",
  "Taking aim!",
  "Going for goal!",
  "Shot incoming!",
]

const TURNOVER_REACTIONS = [
  "Oh! Turnover!",
  "Possession lost!",
  "And they've given it away!",
  "Intercepted!",
  "Change of possession!",
]

const PASS_DESCRIPTIONS = [
  "Nice pass",
  "Smooth exchange",
  "Threading through",
  "Beautiful ball movement",
  "Finding space",
]

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function generateCommentary(events: TelemetryEvent[], variant: string): CommentaryScript {
  const sigilEvents = events.filter((e): e is SigilTransferEvent => e.type === 'sigil.transfer')
  const lines: CommentaryLine[] = []
  
  let goals = 0
  let shots = 0
  let turnovers = 0
  let passes = 0
  
  // Opening commentary
  const startTime = sigilEvents[0] ? new Date(sigilEvents[0].timestamp).getTime() : Date.now()
  
  lines.push({
    timestamp: 0,
    text: `Welcome to the Quantum Agent Gateway sigil demonstration. Today we're showcasing the ${variant} scenario.`,
    emphasis: 'normal',
    speaker: 'play-by-play',
  })
  
  lines.push({
    timestamp: 2000,
    text: pickRandom(PLAY_BY_PLAY_OPENINGS),
    emphasis: 'excited',
    speaker: 'play-by-play',
  })
  
  // Process each transfer
  sigilEvents.forEach((event, index) => {
    const eventTime = new Date(event.timestamp).getTime() - startTime
    const { payload } = event
    const fromLabel = payload.from?.label || payload.from?.id || 'origin'
    const toLabel = payload.to.label || payload.to.id
    const intent = payload.intent.toLowerCase()
    const meta = payload.meta || {}
    
    // Determine event type
    const isGoal = meta.goal === true || intent.includes('goal')
    const isShot = meta.shot === true || intent.includes('shot')
    const isTurnover = meta.turnover === true || intent.includes('turnover') || intent.includes('intercept')
    
    if (isGoal) {
      goals++
      shots++
      // Shot announcement
      if (index > 0) {
        lines.push({
          timestamp: eventTime - 500,
          text: pickRandom(SHOT_CALLS),
          emphasis: 'excited',
          speaker: 'play-by-play',
        })
      }
      // Goal celebration
      lines.push({
        timestamp: eventTime,
        text: `${pickRandom(GOAL_CELEBRATIONS)} ${fromLabel} to ${toLabel}!`,
        emphasis: 'critical',
        speaker: 'play-by-play',
      })
      // Analyst comment
      if (goals === 1) {
        lines.push({
          timestamp: eventTime + 1500,
          text: "And that's how you execute in the agent economy. Payment settled, service delivered.",
          emphasis: 'normal',
          speaker: 'analyst',
        })
      }
    } else if (isShot) {
      shots++
      lines.push({
        timestamp: eventTime - 300,
        text: pickRandom(SHOT_CALLS),
        emphasis: 'excited',
        speaker: 'play-by-play',
      })
      lines.push({
        timestamp: eventTime,
        text: `${fromLabel} takes the shot through ${toLabel}!`,
        emphasis: 'excited',
        speaker: 'play-by-play',
      })
      if (meta.blocked) {
        lines.push({
          timestamp: eventTime + 800,
          text: "Blocked! Great defensive play.",
          emphasis: 'normal',
          speaker: 'analyst',
        })
      }
    } else if (isTurnover) {
      turnovers++
      lines.push({
        timestamp: eventTime,
        text: `${pickRandom(TURNOVER_REACTIONS)} ${toLabel} takes control!`,
        emphasis: 'excited',
        speaker: 'play-by-play',
      })
      if (turnovers === 1) {
        lines.push({
          timestamp: eventTime + 1200,
          text: "This is the unpredictability of the live agent mesh. Budget constraints and policy limits create dynamic gameplay.",
          emphasis: 'normal',
          speaker: 'analyst',
        })
      }
    } else {
      passes++
      // Regular pass
      if (passes % 3 === 0 || intent === 'kickoff') {
        lines.push({
          timestamp: eventTime,
          text: `${pickRandom(PASS_DESCRIPTIONS)} — ${fromLabel} to ${toLabel}`,
          emphasis: 'normal',
          speaker: 'play-by-play',
        })
      }
      
      // Add analyst insight periodically
      if (passes === 3) {
        lines.push({
          timestamp: eventTime + 1000,
          text: pickRandom(ANALYST_INSIGHTS),
          emphasis: 'normal',
          speaker: 'analyst',
        })
      }
    }
    
    // Add narrative if available and important
    if (payload.narrative && (isGoal || isShot || isTurnover)) {
      lines.push({
        timestamp: eventTime + 500,
        text: payload.narrative,
        emphasis: 'normal',
        speaker: 'analyst',
      })
    }
  })
  
  // Closing commentary
  const endTime = sigilEvents.length > 0 
    ? new Date(sigilEvents[sigilEvents.length - 1].timestamp).getTime() - startTime + 2000
    : 20000
    
  lines.push({
    timestamp: endTime,
    text: `And that's the play! ${goals} goal${goals !== 1 ? 's' : ''} scored, ${shots} shot${shots !== 1 ? 's' : ''} attempted, ${passes} passes completed.`,
    emphasis: 'normal',
    speaker: 'play-by-play',
  })
  
  lines.push({
    timestamp: endTime + 2000,
    text: "What you're seeing is more than just data flow — it's an economic game where agents compete, transact, and collaborate in real time.",
    emphasis: 'normal',
    speaker: 'analyst',
  })
  
  // Generate highlights
  const highlights = [
    `${goals} goal${goals !== 1 ? 's' : ''} scored via X402 settlements`,
    `${sigilEvents.length} total possession transfers`,
    `${turnovers} turnover${turnovers !== 1 ? 's' : ''} from budget/policy constraints`,
    `Dynamic agent strategies: conservative, aggressive, balanced, and playmaker roles`,
  ]
  
  if (variant === 'live') {
    highlights.push('Fully randomized gameplay — no two runs are identical')
  }
  
  return {
    title: `Sigil ${variant.charAt(0).toUpperCase() + variant.slice(1)} — Game Commentary`,
    intro: `Welcome to the X402 Quantum Agent Gateway demonstration. You're about to witness the ${variant} scenario, where autonomous agents trade a digital sigil using real blockchain micropayments. Think of it as soccer meets economic simulation — every pass is a transaction, every goal is a completed service.`,
    outro: `That's the power of the X402 protocol in action. Autonomous agents conducting real economic activity, visualized as an engaging game. This isn't just telemetry — it's a living, breathing agent economy.`,
    lines,
    highlights,
  }
}

export function formatCommentaryScript(script: CommentaryScript): string {
  let output = `# ${script.title}\n\n`
  output += `## Introduction\n${script.intro}\n\n`
  output += `## Play-by-Play Commentary\n\n`
  
  script.lines.forEach(line => {
    const timeStr = `[${Math.floor(line.timestamp / 1000)}s]`
    const speaker = line.speaker === 'analyst' ? '📊' : '🎙️'
    const emphasis = line.emphasis === 'critical' ? '🔥 ' : line.emphasis === 'excited' ? '⚡ ' : ''
    output += `${timeStr} ${speaker} ${emphasis}${line.text}\n`
  })
  
  output += `\n## Highlights\n`
  script.highlights.forEach(h => {
    output += `- ${h}\n`
  })
  
  output += `\n## Conclusion\n${script.outro}\n`
  
  return output
}

export function exportCommentaryForVideo(script: CommentaryScript): string {
  // Format for video editing software (simple SRT-like format)
  let output = ''
  
  script.lines.forEach((line, index) => {
    const startMs = line.timestamp
    const endMs = index < script.lines.length - 1 
      ? script.lines[index + 1].timestamp 
      : startMs + 5000
    
    const startTime = formatTimecode(startMs)
    const endTime = formatTimecode(endMs)
    
    output += `${index + 1}\n`
    output += `${startTime} --> ${endTime}\n`
    output += `[${line.speaker === 'analyst' ? 'ANALYST' : 'PLAY-BY-PLAY'}] ${line.text}\n\n`
  })
  
  return output
}

function formatTimecode(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = ms % 1000
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}
