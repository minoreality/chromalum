import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { MusicEngineReturn } from "./useMusicEngine";

type MusicRotationDir = 1 | -1 | 0;

interface UseMusicTransportHandlersOptions {
  engine: MusicEngineReturn;
  droneMuted: boolean;
  setDroneMuted: Dispatch<SetStateAction<boolean>>;
  muted: boolean;
  setMuted: Dispatch<SetStateAction<boolean>>;
  volume: number;
  setVolume: Dispatch<SetStateAction<number>>;
  preMuteVolumeRef: MutableRefObject<number>;
  setAlphaDir: Dispatch<SetStateAction<MusicRotationDir>>;
  setHueDir: Dispatch<SetStateAction<MusicRotationDir>>;
}

export function useMusicTransportHandlers({
  engine,
  droneMuted,
  setDroneMuted,
  muted,
  setMuted,
  volume,
  setVolume,
  preMuteVolumeRef,
  setAlphaDir,
  setHueDir,
}: UseMusicTransportHandlersOptions) {
  const resumeDrone = useCallback(() => {
    if (droneMuted) {
      engine.setDroneMuted(false);
      setDroneMuted(false);
    }
  }, [droneMuted, engine, setDroneMuted]);

  const handleAlphaPlay = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setAlphaDir((d) => (d === 1 ? 0 : 1));
  }, [engine, resumeDrone, setAlphaDir]);

  const handleAlphaReverse = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setAlphaDir((d) => (d === -1 ? 0 : -1));
  }, [engine, resumeDrone, setAlphaDir]);

  const handleHuePlay = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setHueDir((d) => (d === 1 ? 0 : 1));
  }, [engine, resumeDrone, setHueDir]);

  const handleHueReverse = useCallback(() => {
    engine.initAudio();
    resumeDrone();
    setHueDir((d) => (d === -1 ? 0 : -1));
  }, [engine, resumeDrone, setHueDir]);

  const handleMuteToggle = useCallback(() => {
    if (muted) {
      setMuted(false);
      setVolume(preMuteVolumeRef.current);
    } else {
      preMuteVolumeRef.current = volume;
      setMuted(true);
    }
    resumeDrone();
  }, [muted, preMuteVolumeRef, resumeDrone, setMuted, setVolume, volume]);

  const handleVolumeChange = useCallback(
    (v: number) => {
      engine.initAudio();
      setVolume(v);
      if (muted && v > 0) setMuted(false);
    },
    [engine, muted, setMuted, setVolume],
  );

  return {
    resumeDrone,
    handleAlphaPlay,
    handleAlphaReverse,
    handleHuePlay,
    handleHueReverse,
    handleMuteToggle,
    handleVolumeChange,
  };
}
