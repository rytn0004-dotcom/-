export type ResonatorType = 'shorekeeper' | 'jinhsi' | 'changli';

export type CharacterState =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'dodge'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'attack4'
  | 'skill'
  | 'liberation';

export interface DamageNumber {
  id: number;
  value: number;
  isCrit: boolean;
  x: number;
  y: number;
  type: 'spectro' | 'glacio' | 'fusion';
  opacity: number;
}

export interface ResonatorProfile {
  id: ResonatorType;
  name: string;
  title: string;
  element: 'spectro' | 'glacio' | 'fusion';
  maxHp: number;
  hp: number;
  maxForte: number;
  forte: number;
  skillCd: number;
  skillMaxCd: number;
  liberationCd: number;
  liberationMaxCd: number;
  colorHex: number;
}
