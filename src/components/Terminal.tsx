import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, X, Play, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TerminalProps {
  currentFile?: { name: string; language?: string; content?: string };
  onPreviewUrl?: (url: string) => void;
}

export const Terminal = ({ currentFile, onPreviewUrl }: TerminalProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>(['Welcome to AIndroCode Terminal', 'Type any command or "run" to execute current file', '']);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  const addOutput = (text: string) => {
    setOutput(prev => [...prev, text]);
  };

  const handleExecute = async () => {
    if (!input.trim()) return;

    const command = input.trim();
    addOutput(`$ ${command}`);
    setHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    setInput('');
    setIsExecuting(true);

    try {
      // Handle special commands
      if (command === 'clear') {
        setOutput(['']);
        setIsExecuting(false);
        return;
      }

      if (command === 'run' && currentFile?.content) {
        // Run current file
        const language = currentFile.language || 'javascript';
        const result = await api.executeCode({
          code: currentFile.content,
          language,
          path: `/${currentFile.name}`,
        });

        if (result.stdout) addOutput(result.stdout);
        if (result.stderr) addOutput(`ERROR: ${result.stderr}`);
        addOutput(`Exit code: ${result.exitCode}`);
        
        if (result.previewUrl && onPreviewUrl) {
          onPreviewUrl(result.previewUrl);
          addOutput(`Preview available at: ${result.previewUrl}`);
        }
        
        if (!result.success) {
          toast({
            title: 'Execution failed',
            description: result.stderr || 'Unknown error',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Execution completed',
            description: 'Code executed successfully'
          });
        }
      } else if (command.startsWith('npm install') || command.startsWith('pip install') || command.startsWith('apt install') || command.startsWith('apt-get install')) {
        // Package installation
        const parts = command.split(' ');
        const packageManager = parts[0] as 'npm' | 'pip';
        const packages = parts.slice(2);

        addOutput(`Installing ${packages.join(', ')}...`);

        const result = await api.installPackages({
          packageManager,
          packages
        });

        if (result.stdout) addOutput(result.stdout);
        if (result.stderr) addOutput(result.stderr);
        
        if (result.success) {
          toast({
            title: 'Packages installed',
            description: `Successfully installed: ${packages.join(', ')}`
          });
        }
      } else {
        // Execute as shell command
        const result = await api.executeCommand({
          command,
          timeout: 30000
        });

        if (result.stdout) addOutput(result.stdout);
        if (result.stderr) addOutput(result.stderr);
        
        if (!result.success && result.error) {
          addOutput(`ERROR: ${result.error}`);
        }
      }
    } catch (error: any) {
      addOutput(`ERROR: ${error.message || 'Failed to execute command'}`);
      toast({
        title: 'Command failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
      addOutput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: '250px' }}
          exit={{ height: 0 }}
          className="border-t border-border bg-terminal-bg flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">Terminal</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsVisible(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-3 font-mono text-xs space-y-1">
              {output.map((line, i) => (
                <div key={i} className="text-terminal-foreground">
                  {line}
                </div>
              ))}
              {isExecuting && (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Executing...
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-border flex gap-2 bg-background">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type command (run, npm install, ls, etc.)..."
              className="flex-1 bg-card px-3 py-1.5 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              disabled={isExecuting}
              autoComplete="off"
            />
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || !input.trim()}
              className="gap-2"
            >
              <Play className="w-3 h-3" />
              Run
            </Button>
          </div>
        </motion.div>
      )}
      {!isVisible && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 gap-2"
          onClick={() => setIsVisible(true)}
        >
          <TerminalIcon className="w-4 h-4" />
          Show Terminal
        </Button>
      )}
    </AnimatePresence>
  );
};
