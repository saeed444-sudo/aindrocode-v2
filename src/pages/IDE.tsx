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
import { dbManager, Project } from '@/lib/indexedDB';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [currentProjectId, setCurrentProjectId] = useState<string>('default-project');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load project from IndexedDB on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        const projects = await dbManager.getProjects();
        if (projects.length > 0) {
          const project = projects[0];
          setCurrentProjectId(project.id);
          const projectFiles = await dbManager.getProjectFiles(project.id);
          if (projectFiles.length > 0) {
            const convertToFileNodes = (files: any[]): FileNode[] => {
              return files.map(f => ({
                id: f.id,
                name: f.name,
                type: 'file' as const,
                language: f.language,
                content: f.content,
                path: f.path,
              }));
            };
            const loadedFiles = convertToFileNodes(projectFiles);
            setFiles(loadedFiles);
            setSelectedFile(loadedFiles[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load project:', error);
      }
    };
    
    loadProject();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
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

  const handleFileCreate = (name: string, type: 'file' | 'folder', parentPath?: string) => {
    const language = type === 'file' ? name.split('.').pop() || 'plaintext' : undefined;
    const newFile: FileNode = {
      id: Date.now().toString(),
      name,
      type,
      language,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      path: parentPath ? `${parentPath}/${name}` : name,
    };

    if (parentPath) {
      // Add to nested folder
      const addToFolder = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.path === parentPath && node.type === 'folder') {
            return { ...node, children: [...(node.children || []), newFile] };
          }
          if (node.children) {
            return { ...node, children: addToFolder(node.children) };
          }
          return node;
        });
      };
      setFiles(addToFolder(files));
    } else {
      // Add to root
      setFiles([...files, newFile]);
    }

    if (type === 'file') {
      setSelectedFile(newFile);
    }
  };

  const handleFileDelete = (id: string) => {
    const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter((node) => {
        if (node.id === id) return false;
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        return true;
      });
    };

    setFiles(deleteFromTree(files));
    if (selectedFile?.id === id) {
      const findFirstFile = (nodes: FileNode[]): FileNode | undefined => {
        for (const node of nodes) {
          if (node.type === 'file') return node;
          if (node.children) {
            const found = findFirstFile(node.children);
            if (found) return found;
          }
        }
      };
      setSelectedFile(findFirstFile(files) || files[0]);
    }
  };

  const handleFileRename = (id: string, newName: string) => {
    const renameInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          const newPath = node.path?.split('/').slice(0, -1).concat(newName).join('/') || newName;
          return { ...node, name: newName, path: newPath };
        }
        if (node.children) {
          return { ...node, children: renameInTree(node.children) };
        }
        return node;
      });
    };
    
    const updatedFiles = renameInTree(files);
    setFiles(updatedFiles);
    
    if (selectedFile?.id === id) {
      const findFile = (nodes: FileNode[], targetId: string): FileNode | undefined => {
        for (const node of nodes) {
          if (node.id === targetId) return node;
          if (node.children) {
            const found = findFile(node.children, targetId);
            if (found) return found;
          }
        }
      };
      const updated = findFile(updatedFiles, id);
      if (updated) setSelectedFile(updated);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      
      // Update files recursively
      const updateInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.id === selectedFile.id) {
            return updatedFile;
          }
          if (node.children) {
            return { ...node, children: updateInTree(node.children) };
          }
          return node;
        });
      };
      
      setFiles(updateInTree(files));
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

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // Save or update project
      const project: Project = {
        id: currentProjectId,
        name: 'My Project',
        description: 'AIndroCode Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        language: selectedFile?.language || 'javascript',
      };
      
      await dbManager.saveProject(project);

      // Save all files
      const saveFilesRecursive = async (nodes: FileNode[], parentPath = '') => {
        for (const node of nodes) {
          if (node.type === 'file') {
            await dbManager.saveFile({
              id: node.id,
              projectId: currentProjectId,
              path: node.path || node.name,
              name: node.name,
              content: node.content || '',
              language: node.language || 'plaintext',
              updatedAt: Date.now(),
            });
          }
          if (node.children) {
            await saveFilesRecursive(node.children, node.path || node.name);
          }
        }
      };

      await saveFilesRecursive(files);
      
      toast.success('Project saved successfully!');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
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
          <Button variant="ghost" size="icon" onClick={handleSaveClick} title="Save">
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

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your current project and all files to local storage. Your work will be preserved even if you refresh or close the browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IDE;
