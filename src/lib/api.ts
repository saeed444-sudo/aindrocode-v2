const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface ExecuteCodeRequest {
  code: string;
  language: string;
  input?: string;
  files?: Array<{ path: string; content: string }>;
}

export interface ExecuteCodeResponse {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime?: number;
  error?: string;
  previewUrl?: string;
}

export interface CommandRequest {
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface InstallRequest {
  packageManager: 'npm' | 'pip' | 'apt' | 'cargo';
  packages: string[];
}

export interface AIGenerateRequest {
  prompt: string;
  apiKey: string;
  model?: string;
  context?: string;
}

export interface AIFixRequest {
  code: string;
  error: string;
  language: string;
  apiKey: string;
  model?: string;
}

export interface AIChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  apiKey: string;
  model?: string;
  context?: string;
}

export const api = {
  // Execute code
  executeCode: async (request: ExecuteCodeRequest): Promise<ExecuteCodeResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/execute/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  // Execute terminal command
  executeCommand: async (request: CommandRequest): Promise<ExecuteCodeResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/execute/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  // Install packages
  installPackages: async (request: InstallRequest): Promise<ExecuteCodeResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/execute/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  // AI generate code
  generateCode: async (request: AIGenerateRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  // AI fix code
  fixCode: async (request: AIFixRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/ai/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  // AI chat
  chat: async (request: AIChatRequest) => {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  }
};
