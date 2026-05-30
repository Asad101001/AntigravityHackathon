import os
import sys
import time
import random
import urllib.parse
import urllib.request
import logging
from urllib.error import HTTPError, URLError

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../bulk_avatars"))
LOG_FILE = os.path.join(os.path.dirname(__file__), "bulk_generation.log")

os.makedirs(OUTPUT_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("bulk_gen")

# ─────────────────────────────────────────────────────────────────────────────
# DIVERSITY POOLS
# ─────────────────────────────────────────────────────────────────────────────

AGE_BRACKETS = [
    ("late 20s",  0.25),
    ("early 30s", 0.30),
    ("mid 30s",   0.20),
    ("late 30s",  0.12),
    ("early 40s", 0.08),
    ("mid 40s",   0.05),
]

SKIN_TONES = [
    ("fair wheatish complexion",  0.18),
    ("wheatish skin tone",        0.30),
    ("medium brown complexion",   0.28),
    ("dusky brown skin",          0.14),
    ("light olive complexion",    0.10),
]

MALE_STYLES = [
    "neatly trimmed short beard",
    "clean-shaven face",
    "short well-groomed beard",
    "stubble with neat haircut",
    "subtle mustache with clean haircut",
    "light beard with rolled-up sleeves",
    "closely cropped hair no beard",
    "thick eyebrows short tidy beard",
]

MALE_EXPRESSIONS = [
    "warm confident smile",
    "calm professional expression",
    "friendly approachable look",
    "gentle trustworthy expression",
    "composed steady gaze",
]

FEMALE_STYLES = [
    "dupatta lightly draped over head",
    "plain hijab natural minimal makeup",
    "hair covered with colorful dupatta",
    "salwar kameez neckline visible no head cover",
    "simple hijab in earthy tone",
    "dupatta over shoulders modest professional look",
    "neat bun with dupatta loosely worn",
    "plain black hijab calm expression",
    "light foundation natural look neat hair",
]

FEMALE_EXPRESSIONS = [
    "warm professional smile",
    "calm modest expression",
    "friendly composed look",
    "gentle confident expression",
    "approachable dignified gaze",
]

MALE_ATTIRES = [
    "plain shalwar kameez",
    "simple cotton kurta",
    "plain work shirt",
    "neat button-down shirt",
    "traditional shalwar kameez with visible collar"
]

FEMALE_ATTIRES = [
    "plain shalwar kameez with dupatta",
    "modest traditional outfit",
    "neat kameez with light dupatta",
    "plain hijab and modest wear",
    "simple embroidered kameez"
]

BACKGROUNDS = [
    "soft grey neutral studio background",
    "clean off-white background",
    "muted warm beige background",
    "subtle light blue studio backdrop",
    "plain light stone-grey background",
]

LIGHTING = [
    "soft studio lighting",
    "natural window light",
    "soft diffused daylight",
    "warm indoor lighting",
]

CITY_HINTS = [
    "Rawalpindi-Islamabad region facial features",
    "Punjabi facial features",
    "Karachi South-Asian facial features",
    "Pashtun facial features",
    "Baloch facial features",
    "South-Punjabi facial features",
    "Central-Punjabi facial features",
    "Rawalpindi-Potohari facial features",
]

FACE_SHAPES = [
    "round face", "oval face", "square jaw", "sharp jawline", 
    "soft features", "chiseled features", "prominent cheekbones", 
    "wide set eyes", "narrow face", "strong chin", "diamond face shape",
    "heart-shaped face", "deep-set eyes", "high forehead"
]

CAMERAS = [
    "Shot on 35mm lens, f/2.8",
    "Shot on 50mm lens, f/1.4",
    "Shot on 85mm lens, f/1.8",
    "Shot on 105mm lens, f/2.0",
    "Shot on medium format camera, f/2.8"
]

# ─────────────────────────────────────────────────────────────────────────────
# PROMPT GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def build_prompt(gender: str, index: int) -> str:
    """Build a rich, randomized prompt for a given gender."""
    # Seed by gender and index for reproducibility
    rng = random.Random(f"{gender}_{index}_{time.time()}")
    
    age       = rng.choices([a[0] for a in AGE_BRACKETS],  weights=[a[1] for a in AGE_BRACKETS])[0]
    skin      = rng.choices([s[0] for s in SKIN_TONES],    weights=[s[1] for s in SKIN_TONES])[0]
    bg        = rng.choice(BACKGROUNDS)
    light     = rng.choice(LIGHTING)
    city_feat = rng.choice(CITY_HINTS)
    face      = rng.choice(FACE_SHAPES)
    cam       = rng.choice(CAMERAS)
    
    # Injecting a completely random invisible token forces the AI to vary the facial structure drastically
    random_hash = f"uid_{rng.randint(1000, 99999)}"
    
    if gender == "male":
        style      = rng.choice(MALE_STYLES)
        expression = rng.choice(MALE_EXPRESSIONS)
        attire     = rng.choice(MALE_ATTIRES)
        subject_desc = f"{age} Pakistani man, {city_feat}, {face}, {skin}, {style}, {expression}"
    else:
        style      = rng.choice(FEMALE_STYLES)
        expression = rng.choice(FEMALE_EXPRESSIONS)
        attire     = rng.choice(FEMALE_ATTIRES)
        subject_desc = f"{age} Pakistani woman, {city_feat}, {face}, {skin}, {style}, {expression}"

    prompt = (
        f"A photorealistic, highly detailed, high-resolution portrait photograph of a "
        f"{subject_desc}. They are wearing {attire}. "
        f"The background is {bg}. {light}. {cam}, cinematic depth of field, "
        f"sharp focus on the eyes, natural skin texture, masterpiece, 8k resolution, highly professional. ({random_hash})"
    )
    return prompt

# ─────────────────────────────────────────────────────────────────────────────
# GENERATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def generate_image(prompt: str, filename: str) -> bool:
    """Uses pollinations.ai to generate the image with adaptive backoff."""
    encoded_prompt = urllib.parse.quote(prompt)
    seed = random.randint(1, 999999)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true&seed={seed}"
    
    filepath = os.path.join(OUTPUT_DIR, filename)

    max_retries = 10
    base_delay = 8
    
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "image/jpeg, image/png, image/webp"
                }
            )
            with urllib.request.urlopen(req, timeout=120) as response:
                if response.status == 200:
                    with open(filepath, 'wb') as out_file:
                        out_file.write(response.read())
                    log.info(f"[SUCCESS] Saved: {filename}")
                    return True
                
        except HTTPError as e:
            if e.code == 429 or e.code == 402:
                log.warning(f"[{filename}] Queue full/Rate limit (HTTP {e.code}).")
            else:
                log.error(f"[{filename}] HTTPError: {e.code} - {e.reason}")
        except URLError as e:
            log.error(f"[{filename}] URLError: {e.reason}")
        except Exception as e:
            log.error(f"[{filename}] Error: {str(e)}")
            
        if attempt < max_retries:
            delay = base_delay * (2 ** (attempt - 1)) + random.uniform(1, 4)
            log.info(f"[{filename}] Retrying in {delay:.1f} seconds... (Attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)
            
    log.error(f"[FAILED] Could not generate {filename} after {max_retries} attempts.")
    return False

# ─────────────────────────────────────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────────────────────────────────────

def main():
    log.info("Starting Bulk Avatar Generation Pipeline (260 Male, 70 Female, Alternating)")
    
    targets = {"male": 260, "female": 70}
    max_count = max(targets.values())
    total_successful = 0
    
    for i in range(1, max_count + 1):
        for gender in ["male", "female"]:
            if i > targets[gender]:
                continue
                
            filename = f"{gender}_{i:03d}.jpg"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            # Resume logic: Check if file already exists
            if os.path.exists(filepath):
                log.info(f"[SKIP] {filename} already exists.")
                continue
                
            prompt = build_prompt(gender, i)
            log.info(f"[{filename}] Requesting generation...")
            # log.info(f"Prompt: {prompt}")
            
            success = generate_image(prompt, filename)
            if success:
                total_successful += 1
            else:
                log.warning(f"[{filename}] Failed. Continuing to next image...")
                
            # Anti-rate limit pause between requests
            time.sleep(random.uniform(5.5, 8.5))
            
    log.info(f"Bulk generation session complete. New generated images: {total_successful}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("\n[INTERRUPT] Received SIGINT. Exiting gracefully.")
        sys.exit(0)
