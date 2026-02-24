import { createContext, useContext, createSignal, createEffect, onMount, type ParentProps } from "solid-js";
import { AudioEngine, type KeySoundProfile } from "../lib/AudioEngine";
import { AmbientEngine, type AmbientType } from "../lib/AmbientEngine";

export type ASMRContextValue = {
  engine: AudioEngine | null;
  profile: () => KeySoundProfile;
  setProfile: (p: KeySoundProfile) => void;
  ambientType: () => AmbientType;
  setAmbientType: (t: AmbientType) => void;
  ambientVolume: () => number;
  setAmbientVolume: (v: number) => void;
};

const ASMRContext = createContext<ASMRContextValue | null>(null);

export function ASMRManagerProvider(props: ParentProps) {
  const engine = new AudioEngine();
  const ambient = new AmbientEngine();
  const [profile, setProfile] = createSignal<KeySoundProfile>("Clicky");
  const [ambientType, setAmbientType] = createSignal<AmbientType>(null);
  const [ambientVolume, setAmbientVolume] = createSignal(0.2);

  onMount(async () => {
    const ctx = new AudioContext();
    await engine.init(ctx);
    await ambient.init(ctx);
  });

  createEffect(() => {
    engine.setProfile(profile());
  });

  createEffect(() => {
    ambient.setAmbient(ambientType());
  });

  createEffect(() => {
    ambient.setAmbientVolume(ambientVolume());
  });

  const value: ASMRContextValue = {
    engine,
    profile,
    setProfile,
    ambientType,
    setAmbientType,
    ambientVolume,
    setAmbientVolume,
  };

  return (
    <ASMRContext.Provider value={value}>
      {props.children}
    </ASMRContext.Provider>
  );
}

export function useAudioEngine(): ASMRContextValue | null {
  return useContext(ASMRContext);
}
