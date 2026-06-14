export interface CalligraphyStylesInput {
  character?: string;
  script?: string;
  master?: string;
}

export interface ScriptStyle {
  script: string;
  description: string;
  masters: string[];
  characteristics: string;
  suitable: string;
}

export interface CalligraphyStylesResult {
  character: string;
  styles: ScriptStyle[];
  learningPath: string;
  summary: string;
}
