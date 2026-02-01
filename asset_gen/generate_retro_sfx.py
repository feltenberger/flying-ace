import numpy as np
import wave
import struct
import random
import os

SAMPLE_RATE = 44100
AMPLITUDE = 16000 # Max 32767

def save_wav(filename, data):
    """Saves a numpy array as a WAV file."""
    # Ensure data is 16-bit integers
    data = data.astype(np.int16)
    
    with wave.open(filename, 'w') as f:
        f.setnchannels(1) # Mono
        f.setsampwidth(2) # 2 bytes (16 bit)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(data.tobytes())
    print(f"Saved {filename}")

def generate_noise(duration_sec, decay=False):
    samples = int(SAMPLE_RATE * duration_sec)
    noise = np.random.uniform(-1, 1, samples) * AMPLITUDE
    
    if decay:
        # Exponential decay
        envelope = np.exp(-np.linspace(0, 5, samples))
        noise = noise * envelope
        
    return noise

def generate_tone(frequency, duration_sec, type='sine'):
    samples = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, samples, endpoint=False)
    
    if type == 'sine':
        tone = np.sin(2 * np.pi * frequency * t) * AMPLITUDE
    elif type == 'square':
        tone = np.sign(np.sin(2 * np.pi * frequency * t)) * AMPLITUDE
    elif type == 'sawtooth':
        tone = (2 * (t * frequency - np.floor(t * frequency + 0.5))) * AMPLITUDE
        
    return tone

def sfx_engine_loop(duration=2.0):
    # Brown noise (low pass filtered white noise) for rumble
    # Simple approx: Cumulative sum of white noise (Brownian motion)
    samples = int(SAMPLE_RATE * duration)
    white = np.random.uniform(-1, 1, samples)
    brown = np.cumsum(white)
    # Normalize
    brown = (brown / np.max(np.abs(brown))) * AMPLITUDE
    return brown

def sfx_machine_gun(shots=5):
    # Series of short noise bursts
    shot_duration = 0.08
    gap_duration = 0.05
    
    full_sound = np.array([])
    
    for _ in range(shots):
        shot = generate_noise(shot_duration, decay=True)
        gap = np.zeros(int(SAMPLE_RATE * gap_duration))
        full_sound = np.concatenate((full_sound, shot, gap))
        
    return full_sound

def sfx_explosion(duration=1.0):
    # Noise with heavy decay
    return generate_noise(duration, decay=True)

def sfx_coin():
    # High pitch sine wave fast decay
    tone = generate_tone(1200, 0.1, type='sine')
    decay = np.linspace(1, 0, len(tone))
    return tone * decay

def sfx_win_jingle():
    # Simple Arpeggio: C Major (C, E, G, C)
    notes = [523.25, 659.25, 783.99, 1046.50]
    duration = 0.15
    
    full_sound = np.array([])
    for note in notes:
        tone = generate_tone(note, duration, type='square')
        # Apply slight envelope to avoid clicking
        env = np.ones(len(tone))
        env[:500] = np.linspace(0, 1, 500)
        env[-500:] = np.linspace(1, 0, 500)
        full_sound = np.concatenate((full_sound, tone * env))
        
    return full_sound

def main():
    output_dir = "public/audio"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate sounds
    save_wav(os.path.join(output_dir, "engine_loop.wav"), sfx_engine_loop(4.0))
    save_wav(os.path.join(output_dir, "machine_gun.wav"), sfx_machine_gun())
    save_wav(os.path.join(output_dir, "explosion.wav"), sfx_explosion(1.5))
    save_wav(os.path.join(output_dir, "coin.wav"), sfx_coin())
    save_wav(os.path.join(output_dir, "win.wav"), sfx_win_jingle())

if __name__ == "__main__":
    main()
