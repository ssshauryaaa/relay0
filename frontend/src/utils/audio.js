let isMuted = false;
let activeAlarmSource = null;
let activeAlarmGain = null;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const audioManager = {
  setMuted(muted) {
    isMuted = muted;
    if (muted) {
      this.stopAlarm();
    }
  },

  getMuted() {
    return isMuted;
  },

  playKeystroke() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
    }
  },

  playTuneSweep() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      noiseFilter.Q.setValueAtTime(5, ctx.currentTime);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(gain);
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
      osc.start();
      
      noise.stop(ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
    }
  },

  playLock() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      
      [0, 0.12].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const freq = idx === 0 ? 587.33 : 880; // D5 -> A5
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.02, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.16);
      });
    } catch (e) {}
  },

  playMsgSent() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  },

  playMsgRecv() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(700, ctx.currentTime);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1050, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  },

  playPeerOnline() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      
      freqs.forEach((f, i) => {
        const delay = i * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.015, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.25);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.26);
      });
    } catch (e) {}
  },

  startAlarm() {
    if (isMuted) return;
    if (activeAlarmSource) return; // already playing
    
    try {
      const ctx = getAudioContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = "sawtooth";
      osc2.type = "square";
      
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      
      mod.frequency.value = 2.5; // modulate 2.5 times a second
      modGain.gain.value = 150; // swing up/down by 150Hz
      
      osc1.frequency.value = 500;
      osc2.frequency.value = 505;
      
      mod.connect(modGain);
      modGain.connect(osc1.frequency);
      modGain.connect(osc2.frequency);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      mod.start();
      osc1.start();
      osc2.start();
      
      activeAlarmSource = { osc1, osc2, mod, modGain };
      activeAlarmGain = gain;
    } catch (e) {}
  },

  stopAlarm() {
    if (activeAlarmSource) {
      try {
        const { osc1, osc2, mod } = activeAlarmSource;
        osc1.stop();
        osc2.stop();
        mod.stop();
      } catch (e) {}
      activeAlarmSource = null;
      activeAlarmGain = null;
    }
  }
};
