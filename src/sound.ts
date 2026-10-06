import type { Tone } from "./learning";
let audio: AudioContext | undefined;
let enabled = true;
try {
  enabled = localStorage.getItem("yesil-sound") !== "off";
} catch {
  /* Optional preference. */
}
export const soundEnabled = () => enabled;
export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem("yesil-sound", enabled ? "on" : "off");
  } catch {}
  if (enabled) primeSound();
  return enabled;
}
export function primeSound() {
  if (!enabled) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* Audio is optional; gameplay remains available. */
  }
}
export function decisionSound(tone: Tone) {
  if (!enabled || !audio || audio.state !== "running") return;
  const notes =
    tone === "good"
      ? [523.25, 659.25, 783.99]
      : tone === "bad"
        ? [220, 174.61]
        : [440];
  notes.forEach((frequency, i) => {
    const osc = audio!.createOscillator(),
      gain = audio!.createGain(),
      at = audio!.currentTime + i * 0.11;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.025, at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.34);
    osc.connect(gain);
    gain.connect(audio!.destination);
    osc.start(at);
    osc.stop(at + 0.36);
  });
}

export function cueSound(
  kind: "goal" | "combo" | "round" | "final" | "purchase",
) {
  if (!enabled || !audio || audio.state !== "running") return;
  const notes = {
    purchase: [660, 880],
    goal: [880],
    combo: [523, 659, 784, 1047],
    round: [392, 523, 659],
    final: [392, 523, 659, 784, 1047],
  }[kind];
  notes.forEach((frequency, i) => {
    const osc = audio!.createOscillator(),
      gain = audio!.createGain(),
      at = audio!.currentTime + i * 0.13;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(
      kind === "goal" ? 0.015 : 0.035,
      at + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.42);
    osc.connect(gain);
    gain.connect(audio!.destination);
    osc.start(at);
    osc.stop(at + 0.45);
  });
}
