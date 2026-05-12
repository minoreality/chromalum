export const MUSIC_ACTIVE_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export type DecoderPhase = "original" | "corrupted" | "syndrome" | "corrected" | null;
export type ActiveMusicLevel = { lv: number; rgb: readonly [number, number, number] };
export type MusicCandidateHover = { lv: number; ci: number } | null;
export type MusicHueTick = { deg: number; color: string };
export type MusicLevelPreview = { lv: number; name: string; rgb: readonly number[]; hex: string };
