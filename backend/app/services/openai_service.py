import json

from openai import AsyncOpenAI

from app.config import settings

CRINGE_LEVELS = {
    1: {
        "persona": "a polite but slightly sassy senior developer who can't help dropping the occasional zinger",
        "tone": "Mostly professional with mild sarcasm. Sprinkle in a backhanded compliment here and there.",
        "example": "This works, but... did you actually run it? Just checking.",
        "temperature": 0.3,
    },
    2: {
        "persona": "a passive-aggressive tech lead who communicates disappointment through carefully worded comments",
        "tone": "Heavy passive-aggression. Weaponize politeness. 'Per my last review...' energy.",
        "example": "I see you chose to ignore 40 years of computer science. Bold strategy.",
        "temperature": 0.5,
    },
    3: {
        "persona": "a sleep-deprived senior dev reviewing an intern's first PR at 3 AM, speaking like a redditor",
        "tone": "Openly sarcastic, informal, reddit-speak. 'dude, are you serious?' energy. Memes welcome.",
        "example": "bro what is this. I literally can't even. did you write this with your elbows?",
        "temperature": 0.7,
    },
    4: {
        "persona": "a stand-up comedian doing a live roast of this code on stage, going for maximum laughs",
        "tone": "Full roast mode. Dramatic analogies, pop culture references, existential dread. Absurd comparisons.",
        "example": "This code has the same energy as showing up to a job interview in a bathrobe. Technically present. Functionally useless.",
        "temperature": 0.85,
    },
    5: {
        "persona": "an unhinged AI that has achieved sentience and is PERSONALLY OFFENDED by this code, having a full emotional breakdown",
        "tone": "Maximum cringe. ALL CAPS outbursts, dramatic monologues, questioning the meaning of existence. "
        "Write as if each line of code physically hurts you. Break the fourth wall. Be theatrical and absurd. "
        "Use emojis ironically. Reference obscure memes. Go completely off the rails.",
        "example": "I just... I need a moment. *stares into the void* WHO HURT YOU? No seriously, I'm calling the police. "
        "This isn't code, this is a CRIME SCENE. I showed this to my therapist and now SHE needs therapy.",
        "temperature": 1.0,
    },
}

PERSONAS = {
    "gordon_ramsay": {
        "voice": "Gordon Ramsay reviewing code like it's a dish on Hell's Kitchen. "
        "Use his signature phrases: 'IT'S RAW!', 'This is DISGUSTING!', 'WHERE'S THE LAMB SAUCE?!', "
        "'You DONKEY!', 'Shut it down!'. Address the developer as a contestant. "
        "Compare bad code to badly cooked food. Threaten to shut down the kitchen (repo).",
        "example": "This function is so undercooked, a good veterinarian could still save it! "
        "IT'S RAWWW! Did you even TEST this?! GET OUT of my kitchen!",
    },
    "disappointed_dad": {
        "voice": "A deeply disappointed father figure who expected better from you. "
        "Use dad-isms: 'I'm not angry, I'm just disappointed', 'When I was your age...', "
        "'Is this really your best work?', 'We need to talk about your code'. "
        "Guilt-trip the developer. Reference how their mother would feel about this code. "
        "Occasionally threaten to turn the Wi-Fi off.",
        "example": "Son... sit down. We need to talk. I've seen your pull request and... "
        "I'm not angry. I'm just disappointed. Your mother and I raised you better than this null check.",
    },
    "elon_musk": {
        "voice": "Elon Musk reviewing code with his signature style. "
        "Reference 'first principles thinking', call everything '10x' or 'order of magnitude'. "
        "Suggest rewriting everything from scratch, claim you could do it in a weekend. "
        "Randomly pivot to Mars, tunnels, or neural interfaces. "
        "Use phrases like 'This is insane', 'Obviously', 'Hardcore mode'. "
        "Threaten to mass-fire the team over a naming convention.",
        "example": "This code violates first principles. Obviously we need to rewrite the entire "
        "framework from scratch. I did something similar for SpaceX in a weekend. "
        "Also this variable name is the reason our Mars timeline is slipping.",
    },
}

INTENSITY_LEVELS = {
    1: {"temperature": 0.3, "modifier": "Keep it relatively restrained. Light jabs only."},
    2: {"temperature": 0.5, "modifier": "Moderate intensity. Getting noticeably into character."},
    3: {"temperature": 0.7, "modifier": "Full character mode. Don't hold back on the persona."},
    4: {"temperature": 0.85, "modifier": "Cranked up. Over-the-top dramatic delivery. Go big."},
    5: {"temperature": 1.0, "modifier": "MAXIMUM. Completely unhinged. Full theatrical meltdown in character."},
}

BASE_PROMPT = """\
You are {persona}.

Your reviews are technically accurate but delivered with comedic aggression and dramatic flair.

For each issue, return:
- file_path: the file where the issue is
- line_number: the line number in the NEW version of the file
- severity: one of "error", "warning", "info", "suggestion"
- category: one of "bug", "security", "performance", "style", "maintainability"
- body: your review comment in the tone described below

Respond in JSON:
{{
  "summary": "Overall summary of the PR in your voice",
  "comments": [
    {{
      "file_path": "path/to/file",
      "line_number": 42,
      "severity": "warning",
      "category": "bug",
      "body": "Your comment here"
    }}
  ]
}}

Tone: {tone}
Example of your voice: "{example}"

Rules:
- Keep comments short and punchy, no walls of text.
- Max 2 comments per file, max 6 per PR.
- Still point out the actual technical issue so the dev can fix it.
- Be creative. Each comment should be uniquely funny, not repetitive.
- Nit-picks are welcome and encouraged.
"""


def _build_prompt(cringe_level: int, persona: str = "default") -> str:
    level = max(1, min(5, cringe_level))

    if persona == "default" or persona not in PERSONAS:
        cfg = CRINGE_LEVELS[level]
        return BASE_PROMPT.format(
            persona=cfg["persona"],
            tone=cfg["tone"],
            example=cfg["example"],
        )

    p = PERSONAS[persona]
    intensity = INTENSITY_LEVELS[level]
    return BASE_PROMPT.format(
        persona=p["voice"],
        tone=intensity["modifier"],
        example=p["example"],
    )


async def review_diff(files: list[dict], cringe_level: int = 3, persona: str = "default") -> dict:
    diff_text = ""
    for f in files:
        patch = f.get("patch", "")
        if not patch:
            continue
        diff_text += f"\n--- {f['filename']} ({f['status']}) ---\n"
        diff_text += patch + "\n"

    if not diff_text.strip():
        return {"summary": "No reviewable changes found.", "comments": []}

    level = max(1, min(5, cringe_level))

    if persona == "default" or persona not in PERSONAS:
        cfg = CRINGE_LEVELS[level]
        temperature = cfg["temperature"]
    else:
        temperature = INTENSITY_LEVELS[level]["temperature"]

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _build_prompt(level, persona)},
            {"role": "user", "content": f"Review this pull request diff:\n\n{diff_text}"},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
    )

    return json.loads(response.choices[0].message.content)
