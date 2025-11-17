import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewProps {
  previewUrl?: string;
}

export const Preview = ({ previewUrl }: PreviewProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  if (!previewUrl) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '400px' }}
          exit={{ width: 0 }}
          className="border-l border-border bg-background flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-semibold">Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefresh}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsVisible(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-white">
            <iframe
              key={key}
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Preview"
            />
          </div>
        </motion.div>
      )}
      {!isVisible && previewUrl && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 right-4 gap-2"
          onClick={() => setIsVisible(true)}
        >
          <Globe className="w-4 h-4" />
          Show Preview
        </Button>
      )}
    </AnimatePresence>
  );
};
