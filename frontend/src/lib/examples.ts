export interface ExamplePrompt {
  id: string
  label: string
  prompt: string
}

export const examplePrompts: ExamplePrompt[] = [
  {
    id: 'motorcycle',
    label: 'Cyberpunk motorcycle',
    prompt: 'A futuristic cyberpunk motorcycle with glowing blue wheels, metallic body, studio lighting',
  },
  {
    id: 'castle',
    label: 'Medieval castle',
    prompt: 'A medieval stone castle with tall towers, a wooden drawbridge, and mossy walls',
  },
  {
    id: 'robot',
    label: 'Low-poly robot',
    prompt: 'A friendly low-poly robot with a boxy body, round eyes, and matte plastic panels',
  },
  {
    id: 'spaceship',
    label: 'Futuristic spaceship',
    prompt: 'A futuristic spaceship with metallic silver panels and blue neon lights',
  },
  {
    id: 'chair',
    label: 'Wooden chair',
    prompt: 'A handcrafted wooden chair with a curved backrest and visible wood grain',
  },
]
