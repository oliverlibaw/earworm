export interface DialogueLine {
  id: number;
  speaker: string;
  gender: 'male' | 'female';
  spanish: string;
  english: string;
  startTime: number; // in seconds (e.g., 2.45), calculated during audio assembly
  endTime: number;   // in seconds (e.g., 5.80), calculated during audio assembly
  slang?: {
    term: string;          // exact substring in `spanish` to highlight
    literalMeaning: string;
    actualMeaning: string;
    example: string;
  };
}

export interface QuizQuestion {
  id: string;
  type: 'comprehension' | 'slang'; // Last question is always the "Slang Side Quest"
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Episode {
  id: string;              // e.g., "ep-001"
  episodeNumber: number;   // e.g., 1
  date: string;            // YYYY-MM-DD
  title: string;
  region: 'Mexico' | 'Spain' | 'Argentina' | 'Colombia';
  regionFlag: string;      // e.g., "🇲🇽"
  ambientType: 'cafe' | 'street' | 'market' | 'transit';
  audioUrl: string;        // e.g., "/earworm/episodes/2026-11-09.mp3" (respect Next.js basePath if configured)
  durationSeconds: number;
  dialogue: DialogueLine[];
  questions: QuizQuestion[];
}
