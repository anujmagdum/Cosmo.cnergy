import React, { createContext, useContext, useState, useCallback } from 'react';
import { QueuedMailDraft } from '../types';

export type QueueItemStatus = 'pending' | 'sending' | 'success' | 'failed';

export interface QueueItem extends QueuedMailDraft {
  status: QueueItemStatus;
  error?: string;
}

interface MailQueueContextType {
  queue: QueueItem[];
  isProcessing: boolean;
  enqueue: (drafts: QueuedMailDraft[]) => void;
  processQueue: (activeAccount: any) => Promise<void>;
  retryFailed: (activeAccount: any) => Promise<void>;
  clearQueue: () => void;
  removeQueueItem: (id: string) => void;
}

const MailQueueContext = createContext<MailQueueContextType | undefined>(undefined);

export const MailQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const enqueue = useCallback((drafts: QueuedMailDraft[]) => {
    setQueue(prev => [
      ...prev,
      ...drafts.map(d => ({ ...d, status: 'pending' as QueueItemStatus }))
    ]);
  }, []);

  const sendEmail = async (item: QueueItem, activeAccount: any): Promise<boolean> => {
    try {
      const payload = {
        to: item.to,
        subject: item.subject,
        html: item.body,
        account: activeAccount
      };

      const res = await fetch('/api/webmail-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to send email');
      }
      return true;
    } catch (e: any) {
      console.error('Mail dispatch error:', e);
      return false;
    }
  };

  const processQueue = useCallback(async (activeAccount: any) => {
    if (!activeAccount?.email) {
      alert("Please configure your Webmail account first.");
      return;
    }

    setIsProcessing(true);
    
    // We iterate using the state reference so we don't capture stale closures for all items if they change
    // Actually, to avoid stale state in the loop, we will use a loop over the IDs
    const itemsToProcess = queue.filter(q => q.status !== 'success');
    
    for (const currentItem of itemsToProcess) {
      // Mark as sending
      setQueue(prev => prev.map(q => q.id === currentItem.id ? { ...q, status: 'sending' } : q));
      
      const success = await sendEmail(currentItem, activeAccount);
      
      setQueue(prev => prev.map(q => q.id === currentItem.id ? { 
        ...q, 
        status: success ? 'success' : 'failed',
        error: success ? undefined : 'Failed to send'
      } : q));
      
      // Delay slightly between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  }, [queue]);

  const retryFailed = useCallback(async (activeAccount: any) => {
    if (!activeAccount?.email) return;
    setIsProcessing(true);
    
    const itemsToRetry = queue.filter(q => q.status === 'failed');

    for (const currentItem of itemsToRetry) {
      setQueue(prev => prev.map(q => q.id === currentItem.id ? { ...q, status: 'sending' } : q));
      
      const success = await sendEmail(currentItem, activeAccount);
      
      setQueue(prev => prev.map(q => q.id === currentItem.id ? { 
        ...q, 
        status: success ? 'success' : 'failed',
        error: success ? undefined : 'Failed to send'
      } : q));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  }, [queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const removeQueueItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  }, []);

  return (
    <MailQueueContext.Provider value={{ queue, isProcessing, enqueue, processQueue, retryFailed, clearQueue, removeQueueItem }}>
      {children}
    </MailQueueContext.Provider>
  );
};

export const useMailQueue = () => {
  const context = useContext(MailQueueContext);
  if (!context) throw new Error('useMailQueue must be used within MailQueueProvider');
  return context;
};
