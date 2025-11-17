import express from 'express';
import { Sandbox } from '@e2b/sdk';

const router = express.Router();

// Language configurations for e2b
const LANGUAGE_CONFIGS = {
  javascript: { template: 'base', cmd: 'node', ext: 'js' },
  typescript: { template: 'base', cmd: 'npx tsx', ext: 'ts' },
  python: { template: 'base', cmd: 'python3', ext: 'py' },
  c: { template: 'base', cmd: 'gcc -o output code.c && ./output', ext: 'c' },
  cpp: { template: 'base', cmd: 'g++ -o output code.cpp && ./output', ext: 'cpp' },
  go: { template: 'base', cmd: 'go run', ext: 'go' },
  rust: { template: 'base', cmd: 'rustc code.rs -o output && ./output', ext: 'rs' },
  java: { template: 'base', cmd: 'javac Main.java && java Main', ext: 'java' },
  php: { template: 'base', cmd: 'php', ext: 'php' },
  ruby: { template: 'base', cmd: 'ruby', ext: 'rb' },
  shell: { template: 'base', cmd: 'bash', ext: 'sh' }
};

// Execute code in e2b sandbox
router.post('/run', async (req, res) => {
  const { code, language = 'javascript', input = '', files = [] } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const config = LANGUAGE_CONFIGS[language.toLowerCase()];
  if (!config) {
    return res.status(400).json({ 
      error: `Unsupported language: ${language}`,
      supported: Object.keys(LANGUAGE_CONFIGS)
    });
  }

  let sandbox;
  try {
    // Create sandbox
    sandbox = await Sandbox.create({ 
      template: config.template,
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 60000
    });

    // Write code file
    const filename = `code.${config.ext}`;
    await sandbox.files.write(filename, code);

    // Write additional files if provided
    for (const file of files) {
      await sandbox.files.write(file.path, file.content);
    }

    // Install dependencies if package.json exists
    if (language === 'javascript' || language === 'typescript') {
      const hasPackageJson = files.some(f => f.path === 'package.json');
      if (hasPackageJson) {
        const installProc = await sandbox.process.start({ cmd: 'npm install' });
        await installProc.wait();
      }
    }

    // Install Python dependencies if requirements.txt exists
    if (language === 'python') {
      const hasRequirements = files.some(f => f.path === 'requirements.txt');
      if (hasRequirements) {
        const installProc = await sandbox.process.start({ cmd: 'pip install -r requirements.txt' });
        await installProc.wait();
      }
    }

    // Execute code with streaming output
    let stdout = '';
    let stderr = '';
    
    const process = await sandbox.process.start({
      cmd: `${config.cmd} ${filename}`,
      onStdout: (data) => {
        stdout += data;
        console.log('stdout:', data);
      },
      onStderr: (data) => {
        stderr += data;
        console.log('stderr:', data);
      },
    });

    // Send input if provided
    if (input) {
      await process.sendStdin(input);
    }

    // Wait for completion
    const result = await process.wait();

    // Get sandbox URL if it's a web project
    let previewUrl = null;
    if (language === 'javascript' || language === 'typescript') {
      const hasHtml = files.some(f => f.path.endsWith('.html'));
      if (hasHtml) {
        previewUrl = `https://${sandbox.getHostname()}`;
      }
    }

    res.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: stdout || result.stdout || '',
      stderr: stderr || result.stderr || '',
      executionTime: result.timestamp,
      previewUrl
    });

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  } finally {
    if (sandbox) {
      await sandbox.close();
    }
  }
});

// Execute terminal command
router.post('/command', async (req, res) => {
  const { command, cwd = '/home/user', timeout = 30000 } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  let sandbox;
  try {
    sandbox = await Sandbox.create({ 
      template: 'base',
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: timeout
    });

    let stdout = '';
    let stderr = '';

    const process = await sandbox.process.start({
      cmd: command,
      cwd,
      onStdout: (data) => {
        stdout += data;
        console.log('stdout:', data);
      },
      onStderr: (data) => {
        stderr += data;
        console.log('stderr:', data);
      },
    });

    const result = await process.wait();

    res.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: stdout || result.stdout || '',
      stderr: stderr || result.stderr || '',
      cwd
    });

  } catch (error) {
    console.error('Command execution error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  } finally {
    if (sandbox) {
      await sandbox.close();
    }
  }
});

// Install package (npm, pip, etc.)
router.post('/install', async (req, res) => {
  const { packageManager = 'npm', packages = [] } = req.body;

  if (!packages.length) {
    return res.status(400).json({ error: 'Packages array is required' });
  }

  const commands = {
    npm: `npm install ${packages.join(' ')}`,
    pip: `pip install ${packages.join(' ')}`,
    apt: `apt-get update && apt-get install -y ${packages.join(' ')}`,
    cargo: `cargo install ${packages.join(' ')}`
  };

  const command = commands[packageManager];
  if (!command) {
    return res.status(400).json({ 
      error: `Unsupported package manager: ${packageManager}`,
      supported: Object.keys(commands)
    });
  }

  let sandbox;
  try {
    sandbox = await Sandbox.create({ 
      template: 'base',
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 120000 // 2 minutes for installations
    });

    let stdout = '';
    let stderr = '';

    const process = await sandbox.process.start({
      cmd: command,
      onStdout: (data) => {
        stdout += data;
        console.log('stdout:', data);
      },
      onStderr: (data) => {
        stderr += data;
        console.log('stderr:', data);
      },
    });

    const result = await process.wait();

    res.json({
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: stdout || result.stdout || '',
      stderr: stderr || result.stderr || '',
      packages
    });

  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  } finally {
    if (sandbox) {
      await sandbox.close();
    }
  }
});

export default router;
