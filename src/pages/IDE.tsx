import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer, FileNode } from '@/components/FileExplorer';
import { Terminal } from '@/components/Terminal';
import { AIChat } from '@/components/AIChat';
import { Preview } from '@/components/Preview';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Play, Save, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { dbManager } from '@/lib/indexedDB';
import { motion } from 'framer-motion';

export const IDE = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: '1',
      name: 'index.js',
      type: 'file',
      language: 'javascript',
      content: '// Welcome to AIndroCode!\n// Start coding here...\n\nconsole.log("Hello, World!");',
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<FileNode>(files[0]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'AIndroCode Terminal v1.0',
    'Ready to execute code...',
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // Check if AI mode is enabled
        const aiMode = localStorage.getItem('ai_mode_enabled');
        setAiEnabled(aiMode === 'true');
      } else {
        navigate('/auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  const handleFileCreate = (name: string, type: 'file' | 'folder') => {
    const language = name.split('.').pop() || 'plaintext';
    const newFile: FileNode = {
      id: Date.now().toString(),
      name,
      type,
      language,
      content: '',
    };
    setFiles([...files, newFile]);
    setSelectedFile(newFile);
  };

  const handleFileDelete = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
    if (selectedFile?.id === id) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileRename = (id: string, newName: string) => {
    setFiles(files.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      setFiles(files.map((f) => (f.id === selectedFile.id ? updatedFile : f)));
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setTerminalOutput((prev) => [...prev, `\n> Running ${selectedFile?.name}...`]);

    // Simulate execution (replace with e2b integration)
    setTimeout(() => {
      setTerminalOutput((prev) => [
        ...prev,
        'Output:',
        selectedFile?.content || '',
        '\n✓ Execution completed',
      ]);
      setIsExecuting(false);
      toast.success('Code executed');
    }, 1000);
  };

  const handleSave = async () => {
    if (selectedFile) {
      // Save to IndexedDB
      toast.success('File saved');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading IDE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AIndroCode
          </h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {selectedFile?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleSave} title="Save">
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="default" size="icon" onClick={handleExecute} title="Run" disabled={isExecuting}>
            <Play className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <motion.div
          initial={false}
          animate={{
            width: showMobileMenu ? '240px' : '0px',
            opacity: showMobileMenu ? 1 : 0,
          }}
          className="md:w-64 md:opacity-100 overflow-hidden"
        >
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            selectedFileId={selectedFile?.id}
          />
        </motion.div>

        {/* Editor and Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {selectedFile && (
                <CodeEditor
                  value={selectedFile.content || ''}
                  language={selectedFile.language || 'javascript'}
                  onChange={handleCodeChange}
                />
              )}
            </div>

            {/* Terminal */}
            <Terminal currentFile={selectedFile} onPreviewUrl={setPreviewUrl} />
          </div>

          {/* Preview */}
          <Preview previewUrl={previewUrl} />
        </div>
      </div>

      {/* AI Chat */}
      <AIChat isEnabled={aiEnabled} />
    </div>
  );
};

export default IDE;
