import numpy as np
import wave
import os

SAMPLE_RATE = 44100
AMPLITUDE = 8000  # Lower amplitude to avoid clipping when mixing

def save_wav(filename, data):
    data = np.clip(data, -32767, 32767).astype(np.int16)
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(data.tobytes())
    print(f"Saved {filename}")

def generate_tone(freq, duration, wave_type='square'):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    if wave_type == 'sine':
        return np.sin(2 * np.pi * freq * t) * AMPLITUDE
    elif wave_type == 'square':
        return np.sign(np.sin(2 * np.pi * freq * t)) * AMPLITUDE
    elif wave_type == 'saw':
        return (2 * (t * freq - np.floor(t * freq + 0.5))) * AMPLITUDE
    elif wave_type == 'noise':
        return np.random.uniform(-1, 1, len(t)) * AMPLITUDE
    return np.zeros(len(t))

def apply_envelope(audio, attack=0.01, release=0.01):
    total_samples = len(audio)
    attack_samples = int(attack * SAMPLE_RATE)
    release_samples = int(release * SAMPLE_RATE)
    
    env = np.ones(total_samples)
    
    # Attack
    if attack_samples > 0:
        env[:attack_samples] = np.linspace(0, 1, attack_samples)
    
    # Release
    if release_samples > 0:
        env[-release_samples:] = np.linspace(1, 0, release_samples)
        
    return audio * env

# --- SFX: Shotdown ---
def make_shotdown():
    # Descending whistle (Pitch bend)
    duration = 1.5
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    # Frequency sweep from 800Hz to 100Hz
    freqs = np.linspace(800, 100, len(t))
    # Generate variable frequency square wave (phase accumulation)
    phases = np.cumsum(2 * np.pi * freqs / SAMPLE_RATE)
    whistle = np.sign(np.sin(phases)) * AMPLITUDE
    
    # Explosion at the end
    explosion = generate_tone(0, 0.8, 'noise')
    # Decay explosion
    exp_env = np.exp(-np.linspace(0, 5, len(explosion)))
    explosion = explosion * exp_env
    
    # Combine (Whistle overlaps slightly with explosion?)
    # Let's append explosion
    return np.concatenate((whistle, explosion))

# --- Music: Military March ---
def make_theme_home():
    bpm = 110
    beat_dur = 60 / bpm
    
    # Note Frequencies (C Major)
    notes = {
        'C3': 130.81, 'E3': 164.81, 'G3': 196.00,
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25
    }
    
    # Simple March Pattern (Snare rhythm implied by bass staccato)
    # Melody: C E G C G E C...
    melody_score = [
        ('C4', 1), ('C4', 0.5), ('E4', 0.5), ('G4', 1), ('E4', 1),
        ('G4', 1), ('G4', 0.5), ('E4', 0.5), ('C4', 2),
        ('C4', 1), ('E4', 1), ('G4', 1), ('C5', 1),
        ('G4', 1.5), ('E4', 0.5), ('C4', 2)
    ]
    
    full_track = np.array([])
    
    for note_name, beats in melody_score:
        freq = notes.get(note_name, 0)
        dur = beats * beat_dur
        
        # Tone
        tone = generate_tone(freq, dur, 'square')
        tone = apply_envelope(tone, attack=0.02, release=0.05)
        
        full_track = np.concatenate((full_track, tone))
        
    return full_track

def main():
    os.makedirs("public/audio", exist_ok=True)
    
    print("Generating SFX: Shotdown...")
    save_wav("public/audio/shotdown.wav", make_shotdown())
    
    print("Generating Music: Theme Home...")
    save_wav("public/audio/theme-home.wav", make_theme_home())

if __name__ == "__main__":
    main()
