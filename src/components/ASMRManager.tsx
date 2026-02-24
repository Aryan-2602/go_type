import { createContext, useContext, onMount, type ParentProps } from "solid-js";
import { AudioEngine } from "../lib/AudioEngine";

const AudioContext = createContext<AudioEngine | null>(null);

export function ASMRManagerProvider(props: ParentProps) {
  const engine = new AudioEngine();

  onMount(async () => {
    await engine.init();
  });

  return (
    <AudioContext.Provider value={engine}>
      {props.children}
    </AudioContext.Provider>
  );
}

export function useAudioEngine(): AudioEngine | null {
  return useContext(AudioContext);
}
