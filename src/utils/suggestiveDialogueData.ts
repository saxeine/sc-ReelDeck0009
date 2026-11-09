export interface SuggestionCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  items: {
    speaker?: string;
    text: string;
  }[];
}

export const DIALOGUE_CATEGORIES: SuggestionCategory[] = [
  {
    id: "action",
    label: "Action & Suspense",
    icon: "💥",
    color: "rose",
    items: [
      { speaker: "Hero", text: "Look out behind you!" },
      { speaker: "Sidekick", text: "We don't have much time!" },
      { speaker: "Commander", text: "Hold the perimeter, don't let them advance!" },
      { speaker: "Scout", text: "Did you hear that sound?" },
      { speaker: "Hero", text: "Get down! Cover your head!" },
      { speaker: "Operator", text: "Exit route is blocked. You need to jump!" },
      { speaker: "Warrior", text: "Hold the line! Stand together!" },
      { speaker: "Agent", text: "Target acquired. Moving in now." },
      { speaker: "Hero", text: "Whatever happens next, don't look back." },
      { speaker: "Pilot", text: "Brace for impact!" },
    ],
  },
  {
    id: "cinematic",
    label: "Heroic & Drama",
    icon: "🎭",
    color: "amber",
    items: [
      { speaker: "Hero", text: "This ends today, once and for all." },
      { speaker: "Mentor", text: "You were ready the moment you chose to stand." },
      { speaker: "Protagonist", text: "I promised I'd come back for you." },
      { speaker: "Rival", text: "You always were too sentimental." },
      { speaker: "Leader", text: "Some things are worth fighting for." },
      { speaker: "Hero", text: "I won't let anyone else get hurt." },
      { speaker: "Villain", text: "Do you truly believe you can change the outcome?" },
      { speaker: "Companion", text: "If we go down, we go down together." },
      { speaker: "Hero", text: "There's always another way." },
      { speaker: "Narrator", text: "And in that quiet moment, everything shifted." },
    ],
  },
  {
    id: "comedy",
    label: "Comedy & Banter",
    icon: "😂",
    color: "emerald",
    items: [
      { speaker: "Sidekick", text: "Well, that was surprisingly graceful." },
      { speaker: "Hero", text: "Don't look at me, it was your idea!" },
      { speaker: "Rival", text: "Are you kidding me right now?" },
      { speaker: "Companion", text: "On a scale of one to disaster, how bad is this?" },
      { speaker: "Technician", text: "Did you try turning it off and on again?" },
      { speaker: "Hero", text: "I specifically asked for the non-exploding version." },
      { speaker: "Sidekick", text: "I have a very bad feeling about this." },
      { speaker: "Rookie", text: "Wait, is that supposed to be ticking?" },
      { speaker: "Friend", text: "Tell me that wasn't our only way back." },
      { speaker: "Hero", text: "Note to self: never do that again." },
    ],
  },
  {
    id: "scifi",
    label: "Sci-Fi & Cyber",
    icon: "🚀",
    color: "cyan",
    items: [
      { speaker: "A.I.", text: "System anomaly detected in sector seven." },
      { speaker: "Cyberpunk", text: "Neural link established. Downloading breach protocol." },
      { speaker: "Commander", text: "Engage warp drive on my mark." },
      { speaker: "Engineer", text: "Core temperature is rising past safe thresholds!" },
      { speaker: "Hacker", text: "I'm in. We've got 45 seconds before trace lock." },
      { speaker: "Navigator", text: "Coordinates locked. Initiating hyperjump." },
      { speaker: "Drone", text: "Bio-signature confirmed. Unit deploying countermeasures." },
      { speaker: "Pilot", text: "Shields down to 18%! Rerouting auxiliary power!" },
      { speaker: "Scientist", text: "The signal... it's broadcasting from within." },
      { speaker: "A.I.", text: "Probability of survival calculated at 12.4%." },
    ],
  },
  {
    id: "mystery",
    label: "Mystery & Noir",
    icon: "🕵️",
    color: "purple",
    items: [
      { speaker: "Detective", text: "Something about this crime scene doesn't add up." },
      { speaker: "Witness", text: "I didn't see their face... only a silver shadow." },
      { speaker: "Informant", text: "Meet me at midnight under the old harbor pier." },
      { speaker: "Investigator", text: "Follow the paper trail; it always reveals the truth." },
      { speaker: "Stranger", text: "You're asking questions that could get you killed." },
      { speaker: "Detective", text: "The lock wasn't picked from the outside. It was opened from within." },
      { speaker: "Suspect", text: "You've got no proof, detective." },
      { speaker: "Narrator", text: "Rain washed the cobblestones, but couldn't wash the secrets." },
      { speaker: "Watcher", text: "They've been monitoring our frequency the entire week." },
    ],
  },
  {
    id: "casual",
    label: "Everyday & Casual",
    icon: "💬",
    color: "indigo",
    items: [
      { speaker: "Alex", text: "Hey! What took you so long?" },
      { speaker: "Sam", text: "You're not going to believe what just happened." },
      { speaker: "Jordan", text: "Let's grab some coffee and talk about it." },
      { speaker: "Taylor", text: "Are we still on for tonight?" },
      { speaker: "Casey", text: "Wait for me! I'm almost ready!" },
      { speaker: "Morgan", text: "I thought we agreed not to bring this up again." },
      { speaker: "Robin", text: "Check this out—I found something amazing." },
      { speaker: "Riley", text: "Take a breath. We'll figure it out together." },
    ],
  },
  {
    id: "sfx",
    label: "SFX & Expressions",
    icon: "⚡",
    color: "amber",
    items: [
      { text: "*GASP!*" },
      { text: "*SUDDEN CRASH IN THE DISTANCE*" },
      { text: "Hahahahaha!" },
      { text: "NOOOOOOOOO!" },
      { text: "*Heavy breathing in the shadows*" },
      { text: "*WHISPERING*" },
      { text: "Aha! Found you!" },
      { text: "*Sighs deeply*" },
      { text: "Huh?! What was that?!" },
      { text: "*Tense silence broken by footsteps*" },
    ],
  },
];

export const POPULAR_SPEAKERS = [
  "Hero",
  "Sidekick",
  "Villain",
  "Detective",
  "Commander",
  "A.I.",
  "Narrator",
  "Companion",
  "Scientist",
  "Pilot",
  "Witness",
  "Unknown",
];

/**
 * Generate contextual dialogue suggestions based on active shot info and previous captions
 */
export function generateContextualSuggestions(
  shotNo: number,
  action?: string,
  existingCaptions: { speaker?: string; text: string }[] = []
): { speaker: string; text: string; tag: string }[] {
  const cleanAction = (action || "").toLowerCase();
  const suggestions: { speaker: string; text: string; tag: string }[] = [];

  // Action/Combat context
  if (cleanAction.includes("fight") || cleanAction.includes("run") || cleanAction.includes("shot") || cleanAction.includes("battle") || cleanAction.includes("danger") || cleanAction.includes("escape")) {
    suggestions.push(
      { speaker: "Hero", text: "Keep moving! Don't let them corner us!", tag: "Urgent" },
      { speaker: "Sidekick", text: "I've got your back—take the flank!", tag: "Support" },
      { speaker: "Villain", text: "You can't run forever!", tag: "Threat" },
      { speaker: "Commander", text: "All units, fall back to secondary positions!", tag: "Tactical" }
    );
  }
  // Mystery/Investigation context
  else if (cleanAction.includes("look") || cleanAction.includes("search") || cleanAction.includes("find") || cleanAction.includes("clue") || cleanAction.includes("dark") || cleanAction.includes("secret")) {
    suggestions.push(
      { speaker: "Detective", text: "Look closely at this mark... it's still fresh.", tag: "Clue" },
      { speaker: "Companion", text: "Someone was here right before we arrived.", tag: "Observation" },
      { speaker: "Narrator", text: "The clues began falling into place, piece by piece.", tag: "Lore" },
      { speaker: "Witness", text: "I swore I'd never speak of that night again.", tag: "Reveal" }
    );
  }
  // Sci-fi / Tech context
  else if (cleanAction.includes("tech") || cleanAction.includes("ship") || cleanAction.includes("space") || cleanAction.includes("cyber") || cleanAction.includes("code") || cleanAction.includes("robot")) {
    suggestions.push(
      { speaker: "A.I.", text: "Overriding primary security mainframe now.", tag: "Cyber" },
      { speaker: "Pilot", text: "Sensors picking up three unidentified craft ahead.", tag: "Warning" },
      { speaker: "Engineer", text: "If we reroute the conduits, we might get one clean shot.", tag: "Strategy" },
      { speaker: "Captain", text: "Lock target coordinates and fire on my command!", tag: "Action" }
    );
  }
  // Generic / Dramatic default progression based on shot number
  else {
    if (shotNo <= 2) {
      // Opening shots
      suggestions.push(
        { speaker: "Narrator", text: "It started like any other ordinary day...", tag: "Intro" },
        { speaker: "Protagonist", text: "I have a feeling today is going to be different.", tag: "Hook" },
        { speaker: "Companion", text: "Are you ready for what comes next?", tag: "Setup" },
        { speaker: "Observer", text: "Watch closely; nothing here is accidental.", tag: "Foreshadow" }
      );
    } else if (shotNo >= 8) {
      // Climax / Finale shots
      suggestions.push(
        { speaker: "Hero", text: "This is our last chance. Everything is on the line.", tag: "Climax" },
        { speaker: "Villain", text: "You're too late! The process is irreversible!", tag: "Showdown" },
        { speaker: "Companion", text: "I'm right beside you, all the way to the end.", tag: "Resolve" },
        { speaker: "Narrator", text: "And with one final strike, destiny was rewritten.", tag: "Finale" }
      );
    } else {
      // Mid-story shots
      suggestions.push(
        { speaker: "Hero", text: "We need to rethink our approach before it's too late.", tag: "Pivot" },
        { speaker: "Sidekick", text: "There's something you're not telling me.", tag: "Tension" },
        { speaker: "Mentor", text: "Trust in the training you've endured.", tag: "Wisdom" },
        { speaker: "Rival", text: "Did you honestly believe you'd get past me?", tag: "Obstacle" }
      );
    }
  }

  // If there are existing captions, generate reactive follow-up lines
  if (existingCaptions.length > 0) {
    const lastCaption = existingCaptions[existingCaptions.length - 1];
    const otherSpeaker = lastCaption.speaker === "Hero" ? "Sidekick" : lastCaption.speaker === "Detective" ? "Witness" : "Hero";
    suggestions.unshift({
      speaker: otherSpeaker,
      text: `Then what are we waiting for? Let's do it!`,
      tag: "Follow-up",
    });
  }

  return suggestions.slice(0, 5);
}
