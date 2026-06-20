export interface OnsetDetectionOptions {
  fftSize: number;
  hopSize: number;
  threshold: number;
  minInterOnsetInterval: number;
  sensitivity: number;
}

export interface OnsetEvent {
  time: number;
  strength: number;
  frequency: number;
}

const DEFAULT_OPTIONS: OnsetDetectionOptions = {
  fftSize: 2048,
  hopSize: 512,
  threshold: 0.3,
  minInterOnsetInterval: 80,
  sensitivity: 0.6,
};

export class OnsetDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private options: OnsetDetectionOptions;
  private isRunning: boolean = false;
  private lastOnsetTime: number = 0;
  private lastOnsets: OnsetEvent[] = [];
  
  private spectrumBuffer: Float32Array | null = null;
  private prevSpectrum: Float32Array | null = null;
  private energyHistory: number[] = [];
  private spectralFluxHistory: number[] = [];
  private callback: ((onset: OnsetEvent) => void) | null = null;
  
  private animationFrameId: number | null = null;
  private baseTime: number = 0;
  private audioStartTime: number = 0;

  constructor(options: Partial<OnsetDetectionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async init(stream: MediaStream): Promise<void> {
    this.stream = stream;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.options.fftSize;
    this.analyser.smoothingTimeConstant = 0.1;
    
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    
    const bufferSize = this.options.fftSize / 2;
    this.spectrumBuffer = new Float32Array(bufferSize);
    this.prevSpectrum = new Float32Array(bufferSize).fill(0);
    this.energyHistory = [];
    this.spectralFluxHistory = [];
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.audioStartTime = this.audioContext.currentTime;
    this.baseTime = performance.now();
  }

  setCallback(callback: (onset: OnsetEvent) => void): void {
    this.callback = callback;
  }

  setSensitivity(sensitivity: number): void {
    this.options.sensitivity = Math.max(0.1, Math.min(1.0, sensitivity));
    this.options.threshold = 0.1 + (1.0 - this.options.sensitivity) * 0.5;
  }

  start(): void {
    if (this.isRunning || !this.analyser) return;
    this.isRunning = true;
    this.lastOnsetTime = 0;
    this.lastOnsets = [];
    this.process();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private process = (): void => {
    if (!this.isRunning || !this.analyser || !this.spectrumBuffer || !this.prevSpectrum) {
      return;
    }

    this.analyser.getFloatFrequencyData(this.spectrumBuffer);
    
    const spectralFlux = this.computeSpectralFlux();
    const energy = this.computeEnergy();
    
    this.energyHistory.push(energy);
    this.spectralFluxHistory.push(spectralFlux);
    
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }
    if (this.spectralFluxHistory.length > 43) {
      this.spectralFluxHistory.shift();
    }
    
    const onset = this.detectOnset(spectralFlux, energy);
    
    if (onset) {
      const currentTime = this.getCurrentTime();
      onset.time = currentTime;
      
      if (currentTime - this.lastOnsetTime >= this.options.minInterOnsetInterval) {
        this.lastOnsetTime = currentTime;
        this.lastOnsets.push(onset);
        
        if (this.lastOnsets.length > 20) {
          this.lastOnsets.shift();
        }
        
        if (this.callback) {
          this.callback(onset);
        }
      }
    }

    this.prevSpectrum.set(this.spectrumBuffer);
    
    this.animationFrameId = requestAnimationFrame(this.process);
  };

  private computeSpectralFlux(): number {
    if (!this.spectrumBuffer || !this.prevSpectrum) return 0;
    
    let flux = 0;
    const length = this.spectrumBuffer.length;
    
    for (let i = 0; i < length; i++) {
      const diff = this.spectrumBuffer[i] - this.prevSpectrum[i];
      if (diff > 0) {
        flux += diff;
      }
    }
    
    return flux / length;
  }

  private computeEnergy(): number {
    if (!this.spectrumBuffer) return 0;
    
    let energy = 0;
    const length = this.spectrumBuffer.length;
    
    for (let i = 0; i < length; i++) {
      const magnitude = Math.pow(10, this.spectrumBuffer[i] / 20);
      energy += magnitude * magnitude;
    }
    
    return Math.sqrt(energy / length);
  }

  private detectOnset(spectralFlux: number, energy: number): OnsetEvent | null {
    const fluxHistory = this.spectralFluxHistory;
    const energyHistory = this.energyHistory;
    
    if (fluxHistory.length < 15) return null;
    
    const recentFlux = fluxHistory.slice(-15);
    const meanFlux = recentFlux.reduce((a, b) => a + b, 0) / recentFlux.length;
    const stdFlux = Math.sqrt(
      recentFlux.reduce((a, b) => a + Math.pow(b - meanFlux, 2), 0) / recentFlux.length
    );
    
    const recentEnergy = energyHistory.slice(-15);
    const meanEnergy = recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length;
    const stdEnergy = Math.sqrt(
      recentEnergy.reduce((a, b) => a + Math.pow(b - meanEnergy, 2), 0) / recentEnergy.length
    );
    
    const adaptiveThreshold = meanFlux + this.options.threshold * stdFlux;
    const energyThreshold = meanEnergy + 0.5 * stdEnergy;
    
    const isLocalMax = this.isLocalMaximum(fluxHistory, fluxHistory.length - 1, 5);
    
    if (spectralFlux > adaptiveThreshold && energy > energyThreshold && isLocalMax) {
      let peakFreq = 0;
      let peakMagnitude = -Infinity;
      
      if (this.spectrumBuffer) {
        for (let i = 4; i < Math.min(200, this.spectrumBuffer.length); i++) {
          if (this.spectrumBuffer[i] > peakMagnitude) {
            peakMagnitude = this.spectrumBuffer[i];
            peakFreq = i * (this.audioContext?.sampleRate || 44100) / this.options.fftSize;
          }
        }
      }
      
      const strength = (spectralFlux - meanFlux) / (stdFlux || 1);
      
      return {
        time: 0,
        strength: Math.min(1.0, strength / 3),
        frequency: peakFreq,
      };
    }
    
    return null;
  }

  private isLocalMaximum(array: number[], index: number, window: number): boolean {
    const value = array[index];
    const start = Math.max(0, index - window);
    const end = Math.min(array.length, index + window + 1);
    
    for (let i = start; i < end; i++) {
      if (i !== index && array[i] > value) {
        return false;
      }
    }
    
    return true;
  }

  getCurrentTime(): number {
    if (!this.audioContext) {
      return performance.now() - this.baseTime;
    }
    const elapsedAudio = this.audioContext.currentTime - this.audioStartTime;
    return elapsedAudio * 1000;
  }

  async destroy(): Promise<void> {
    this.stop();
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.spectrumBuffer = null;
    this.prevSpectrum = null;
    this.energyHistory = [];
    this.spectralFluxHistory = [];
  }

  getLastOnsets(): OnsetEvent[] {
    return [...this.lastOnsets];
  }
}
