import numpy as np
import wave
import os
import random

SAMPLE_RATE = 44100
AMPLITUDE = 8000  # -10dB approx to allow mixing

def save_wav(filename, data):
    # Create dir if not exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # Clip and convert
    data = np.nan_to_num(data)
    data = np.clip(data, -32767, 32767).astype(np.int16)
    
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(data.tobytes())
    print(f"Saved {filename}")

# --- Synthesis Primitives ---

def gen_tone(freq, duration, wave_type='square'):
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)
    
    if wave_type == 'sine':
        return np.sin(2 * np.pi * freq * t) * AMPLITUDE
    elif wave_type == 'square':
        return np.sign(np.sin(2 * np.pi * freq * t)) * AMPLITUDE
    elif wave_type == 'triangle':
        return (2 * np.abs(2 * (t * freq - np.floor(t * freq + 0.5))) - 1) * AMPLITUDE
    elif wave_type == 'saw':
        return (2 * (t * freq - np.floor(t * freq + 0.5))) * AMPLITUDE
    elif wave_type == 'noise':
        return np.random.uniform(-1, 1, len(t)) * AMPLITUDE
    return np.zeros(len(t))

def gen_slide(start_freq, end_freq, duration, wave_type='square'):
    samples = int(SAMPLE_RATE * duration)
    # Frequency sweep
    freqs = np.linspace(start_freq, end_freq, samples)
    # Phase accumulation
    phases = np.cumsum(2 * np.pi * freqs / SAMPLE_RATE)
    
    if wave_type == 'square':
        return np.sign(np.sin(phases)) * AMPLITUDE
    elif wave_type == 'sine':
        return np.sin(phases) * AMPLITUDE
    return np.zeros(samples)

def apply_env(audio, attack=0.01, release=0.01):
    samples = len(audio)
    a_samp = int(attack * SAMPLE_RATE)
    r_samp = int(release * SAMPLE_RATE)
    
    env = np.ones(samples)
    if a_samp > 0:
        env[:a_samp] = np.linspace(0, 1, a_samp)
    if r_samp > 0 and r_samp < samples:
        env[-r_samp:] = np.linspace(1, 0, r_samp)
        
    return audio * env

# --- Music Generators ---

def music_theme_home():
    # Military March, C Major, 110 BPM
    bpm = 110
    beat = 60 / bpm
    
    notes = [
        ('C4', 1), ('C4', 0.5), ('E4', 0.5), ('G4', 1), ('E4', 1),
        ('G4', 1), ('G4', 0.5), ('E4', 0.5), ('C4', 2),
        ('G3', 1), ('C4', 1), ('E4', 1), ('G4', 1),
        ('C5', 1.5), ('G4', 0.5), ('E4', 1), ('C4', 1),
        # Repeat phrase
        ('D4', 1), ('D4', 0.5), ('F4', 0.5), ('A4', 1), ('F4', 1),
        ('G4', 2), ('G3', 2)
    ]
    
    track = np.array([])
    freqs = {'C4':261.6, 'D4':293.7, 'E4':329.6, 'F4':349.2, 'G4':392.0, 'A4':440.0, 'B4':493.9, 'C5':523.3, 'G3':196.0}
    
    for note, dur in notes:
        f = freqs.get(note, 0)
        tone = gen_tone(f, dur*beat, 'square')
        tone = apply_env(tone, 0.02, 0.05)
        track = np.concatenate((track, tone))
        
    # Loop it twice
    return np.concatenate((track, track))

def music_theme_game():
    # Driving pulse, A Minor, 140 BPM
    bpm = 140
    beat = 60 / bpm
    
    track = np.array([])
    
    # Bassline pattern (A2 - A2 - C3 - A2)
    bass_freqs = [110, 110, 130.8, 110, 146.8, 110, 130.8, 110]
    
    for _ in range(4): # 4 Bars
        for f in bass_freqs:
            tone = gen_tone(f, 0.5*beat, 'triangle') # Triangle for bass
            tone = apply_env(tone, 0.01, 0.01)
            track = np.concatenate((track, tone))
            
    return track

def music_theme_victory():
    # Fanfare, C Major
    bpm = 120
    beat = 60 / bpm
    
    notes = [
        ('C4', 0.5), ('E4', 0.5), ('G4', 0.5), ('C5', 2),
        ('G4', 0.5), ('C5', 3)
    ]
    freqs = {'C4':261.6, 'E4':329.6, 'G4':392.0, 'C5':523.3}
    
    track = np.array([])
    for note, dur in notes:
        tone = gen_tone(freqs[note], dur*beat, 'square')
        tone = apply_env(tone, 0.02, 0.1)
        track = np.concatenate((track, tone))
    return track

# --- SFX Generators ---

def sfx_dice_roll():
    # Staccato noise bursts
    track = np.array([])
    for _ in range(8):
        burst = gen_tone(0, 0.04, 'noise')
        burst = apply_env(burst, 0.005, 0.02)
        gap = np.zeros(int(SAMPLE_RATE * 0.03))
        track = np.concatenate((track, burst, gap))
    
    # Final thud
    thud = gen_tone(100, 0.15, 'square') # Low square thud
    thud = apply_env(thud, 0.01, 0.1)
    # Low pass approx (simple moving average)
    thud = np.convolve(thud, np.ones(5)/5, mode='same')
    
    return np.concatenate((track, thud))

def sfx_shotdown():
    # Whistle + Explosion
    whistle = gen_slide(800, 100, 1.2, 'square')
    whistle = apply_env(whistle, 0.1, 0.1)
    
    boom = gen_tone(0, 1.0, 'noise')
    # Exponential decay env
    decay = np.exp(-np.linspace(0, 6, len(boom)))
    boom = boom * decay
    
    return np.concatenate((whistle, boom))

def sfx_dogfight_start():
    # Siren
    track = np.array([])
    tone_hi = gen_tone(800, 0.2, 'square')
    tone_lo = gen_tone(600, 0.2, 'square')
    
    for _ in range(4):
        track = np.concatenate((track, tone_hi, tone_lo))
    return track

def sfx_dogfight_win():
    # Maj Arpeggio
    notes = [440, 554, 659, 880] # A Major
    track = np.array([])
    for f in notes:
        t = gen_tone(f, 0.12, 'square')
        t = apply_env(t, 0.01, 0.05)
        track = np.concatenate((track, t))
    return track

def sfx_dogfight_lose():
    # Descending Chromatic
    notes = [440, 415, 392, 370, 349, 100]
    track = np.array([])
    for f in notes[:-1]:
        t = gen_tone(f, 0.1, 'saw')
        t = apply_env(t, 0.01, 0.01)
        track = np.concatenate((track, t))
    
    # Final buzz
    buzz = gen_tone(100, 0.5, 'saw')
    buzz = apply_env(buzz, 0.05, 0.4)
    track = np.concatenate((track, buzz))
    return track

def sfx_fuel_gain():
    # Rising Chime
    notes = [523, 659, 784] # C E G
    track = np.array([])
    for f in notes:
        t = gen_tone(f, 0.1, 'sine') # Sine for "bubbly"
        t = apply_env(t, 0.01, 0.05)
        track = np.concatenate((track, t))
    return track

def sfx_jackpot():
    # Fast Arp
    notes = [523, 659, 784, 1046, 1318, 1568]
    track = np.array([])
    for f in notes:
        t = gen_tone(f, 0.08, 'triangle')
        t = apply_env(t, 0.01, 0.01)
        track = np.concatenate((track, t))
    return track

def sfx_shop_purchase():
    # Click + Chime
    click = gen_tone(0, 0.02, 'noise')
    gap = np.zeros(int(SAMPLE_RATE * 0.05))
    chime1 = gen_tone(880, 0.1, 'sine')
    chime2 = gen_tone(1760, 0.2, 'sine')
    chime1 = apply_env(chime1)
    chime2 = apply_env(chime2)
    return np.concatenate((click, gap, chime1, chime2))

def sfx_bomb_hit():
    # Heavy Explosion
    boom = gen_tone(0, 1.5, 'noise')
    # Mix with low square for "punch"
    punch = gen_tone(60, 0.3, 'square')
    # Pad punch to length of boom
    punch = np.concatenate((punch, np.zeros(len(boom)-len(punch))))
    
    # Envelope
    env = np.exp(-np.linspace(0, 5, len(boom)))
    
    mix = (boom * 0.7 + punch * 0.3) * env
    return mix

def sfx_bomb_miss():
    # Whistle + Dull Thud
    whistle = gen_slide(800, 200, 0.5, 'square')
    whistle = apply_env(whistle, 0.01, 0.01)
    
    gap = np.zeros(int(SAMPLE_RATE * 0.1))
    
    # Dull thud (Low freq sine decay)
    thud = gen_tone(80, 0.4, 'sine')
    thud = apply_env(thud, 0.01, 0.3)
    
    return np.concatenate((whistle, gap, thud))

def sfx_victory():
    return music_theme_victory() # Reuse

def sfx_eliminated():
    return sfx_dogfight_lose() # Reuse/Modify

def sfx_handover():
    # C -> E
    t1 = gen_tone(523, 0.2, 'square')
    t2 = gen_tone(659, 0.4, 'square')
    t1 = apply_env(t1); t2 = apply_env(t2)
    return np.concatenate((t1, t2))

def sfx_button_click():
    return apply_env(gen_tone(440, 0.05, 'square'), 0.005, 0.005)

# --- Main Generation Map ---

def main():
    base_dir = "public/audio"
    
    tasks = [
        ("music/theme-home.wav", music_theme_home),
        ("music/theme-game.wav", music_theme_game),
        ("music/theme-victory.wav", music_theme_victory),
        ("sfx/dice-roll.wav", sfx_dice_roll),
        ("sfx/shotdown.wav", sfx_shotdown),
        ("sfx/dogfight-start.wav", sfx_dogfight_start),
        ("sfx/dogfight-win.wav", sfx_dogfight_win),
        ("sfx/dogfight-lose.wav", sfx_dogfight_lose),
        ("sfx/fuel-gain.wav", sfx_fuel_gain),
        ("sfx/jackpot.wav", sfx_jackpot),
        ("sfx/shop-purchase.wav", sfx_shop_purchase),
        ("sfx/bomb-hit.wav", sfx_bomb_hit),
        ("sfx/bomb-miss.wav", sfx_bomb_miss),
        ("sfx/victory.wav", sfx_victory),
        ("sfx/eliminated.wav", sfx_eliminated),
        ("sfx/handover-chime.wav", sfx_handover),
        ("sfx/button-click.wav", sfx_button_click),
    ]
    
    for path, func in tasks:
        full_path = os.path.join(base_dir, path)
        print(f"Generating {full_path}...")
        try:
            audio_data = func()
            save_wav(full_path, audio_data)
        except Exception as e:
            print(f"Failed to generate {full_path}: {e}")

if __name__ == "__main__":
    main()
