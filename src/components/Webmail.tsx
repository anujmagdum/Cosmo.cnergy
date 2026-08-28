"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { WebmailAccount, EmailMessage, EmailAttachment, QueuedMailDraft } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  FileText,
  RefreshCw,
  Plus,
  Settings,
  Search,
  Paperclip,
  Reply,
  Forward,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  Eye,
  Download
} from 'lucide-react';

interface Props {
  currentUser?: string;
  onOpenAuth?: () => void;
  initialCompose?: {
    to?: string;
    subject?: string;
    body?: string;
    context?: string;
    orderToConfirm?: any;
  } | null;
  onSendSuccess?: (orderToConfirm?: any) => void;
  mailDraftQueue?: import('../types').QueuedMailDraft[];
  onPopMailDraftQueue?: (id: string) => void;
  onClearMailDraftQueue?: () => void;
  onClearInitialCompose?: () => void;
}

const DEFAULT_ACCOUNTS: WebmailAccount[] = [
  {
    id: 'acc-procurement',
    email: 'procurement@cosmocnergy.com',
    senderName: 'CosmoCnergy Procurement Head',
    imapHost: 'mail.cosmocnergy.com',
    imapPort: 993,
    smtpHost: 'mail.cosmocnergy.com',
    smtpPort: 465,
    username: 'procurement@cosmocnergy.com',
    password: '',
    isDefault: true,
  },
  {
    id: 'acc-sales',
    email: 'sales@cosmocnergy.com',
    senderName: 'CosmoCnergy Sales & Supply',
    imapHost: 'mail.cosmocnergy.com',
    imapPort: 993,
    smtpHost: 'mail.cosmocnergy.com',
    smtpPort: 465,
    username: 'sales@cosmocnergy.com',
    password: '',
  },
  {
    id: 'acc-support',
    email: 'support@cosmocnergy.com',
    senderName: 'CosmoCnergy Supplier Support',
    imapHost: 'mail.cosmocnergy.com',
    imapPort: 993,
    smtpHost: 'mail.cosmocnergy.com',
    smtpPort: 465,
    username: 'support@cosmocnergy.com',
    password: '',
  }
];

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'mail-101',
    accountEmail: 'procurement@cosmocnergy.com',
    folder: 'inbox',
    from: 'Rajesh Sharma <sales@celltechenergy.com>',
    to: 'procurement@cosmocnergy.com',
    subject: 'Proforma Invoice & Dispatch Schedule: 3.2V 100Ah LFP Cells (Batch 640 Units)',
    date: new Date(Date.now() - 3600000 * 2).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    timestamp: Date.now() - 3600000 * 2,
    snippet: 'Greetings CosmoCnergy Procurement Team, We have confirmed your Purchase Order PO-2026-0801 for 640 units of Grade A 3.2V 100Ah LFP Cells...',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #073642; line-height: 1.6;">
        <p>Dear Procurement Team,</p>
        <p>Thank you for issuing <strong>PO-2026-0801</strong>. We have allocated and pre-tested <strong>640 units of 3.2V 100Ah LFP Grade A Cells</strong> with serial matching (within 0.05 mΩ IR tolerance).</p>
        <p><strong>Order Summary:</strong></p>
        <ul>
          <li><strong>PO Reference:</strong> PO-2026-0801</li>
          <li><strong>Item:</strong> 3.2V 100Ah LFP Grade A Cell (M6 Terminals, 6000 Cycles)</li>
          <li><strong>Quantity:</strong> 640 Units @ ₹2,850/unit</li>
          <li><strong>Total Amount:</strong> ₹18,24,000.00 (Excl. GST)</li>
          <li><strong>Estimated Dispatch Date:</strong> Tomorrow by 11:00 AM IST via SafeExpress Logistics</li>
        </ul>
        <p>The formal signed Proforma Invoice & Test Reports are attached for your verification.</p>
        <br/>
        <p>Best regards,<br/><strong>Rajesh Sharma</strong><br/>Head of Commercial Sales | CellTech Energy Systems<br/>Phone: +91 98765 43210</p>
      </div>
    `,
    isUnread: true,
    isStarred: true,
    hasAttachments: true,
    attachments: [
      {
        filename: 'PI_CellTech_PO_2026_0801.pdf',
        size: '284 KB',
        type: 'application/pdf'
      },
      {
        filename: 'Cell_Batch_Grading_Report.xlsx',
        size: '142 KB',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ]
  },
  {
    id: 'mail-102',
    accountEmail: 'procurement@cosmocnergy.com',
    folder: 'inbox',
    from: 'Pooja Hegde <contact@smartbmscontrols.in>',
    to: 'procurement@cosmocnergy.com',
    subject: 'Quotation Confirmation: 16S 100A Smart BMS with CAN/RS485 Protocol Support',
    date: new Date(Date.now() - 3600000 * 6).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    timestamp: Date.now() - 3600000 * 6,
    snippet: 'Dear Sir, In response to your RFQ for 16S 100A Smart BMS units with active balance module, please find our official commercial offer...',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #073642; line-height: 1.6;">
        <p>Dear Anuj / Procurement Lead,</p>
        <p>We are pleased to submit our formal commercial quotation for the <strong>16S 100A Smart LiFePO4 BMS</strong> units:</p>
        <ul>
          <li><strong>Unit Price:</strong> ₹4,200 / unit (for volume $\\ge$ 50 units)</li>
          <li><strong>Features:</strong> Dual NTC temperature sensors, CANBUS 2.0B, RS485 Isolated Port, 1A Active Balancer</li>
          <li><strong>Warranty:</strong> 24 Months replacement warranty</li>
          <li><strong>Lead Time:</strong> Ready in stock (ex-factory Pune)</li>
        </ul>
        <p>Kindly issue PO to confirm production slot.</p>
        <br/>
        <p>Warm regards,<br/><strong>Pooja Hegde</strong><br/>Sales Manager | SmartBMS Controls India</p>
      </div>
    `,
    isUnread: false,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        filename: 'Commercial_Quote_16S_SmartBMS.pdf',
        size: '310 KB',
        type: 'application/pdf'
      }
    ]
  },
  {
    id: 'mail-103',
    accountEmail: 'procurement@cosmocnergy.com',
    folder: 'inbox',
    from: 'Vikram Joshi <vikram@customenclosures.co.in>',
    to: 'procurement@cosmocnergy.com',
    subject: 'Sheet Metal Enclosure Drawings Approved (48V 100Ah Wall-Mount IP65)',
    date: new Date(Date.now() - 3600000 * 24).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    timestamp: Date.now() - 3600000 * 24,
    snippet: 'Hi Team, Our CAD engineering team has finalized the laser cutting dxf and CNC bending toolpath for the 48V 100Ah battery box enclosure...',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #073642; line-height: 1.6;">
        <p>Hi Procurement & Engineering,</p>
        <p>The revised powder-coated CRCA steel enclosures with IP65 silicone gasket sealing have been approved for production batch run.</p>
        <p>Production timeline: 4 days for 40 units.</p>
        <p>Best regards,<br/><strong>Vikram Joshi</strong><br/>Custom Enclosures Pune</p>
      </div>
    `,
    isUnread: false,
    isStarred: true,
    hasAttachments: false,
  },
  {
    id: 'mail-104',
    accountEmail: 'procurement@cosmocnergy.com',
    folder: 'sent',
    from: 'CosmoCnergy Procurement <procurement@cosmocnergy.com>',
    to: 'sales@celltechenergy.com',
    subject: 'Purchase Order Issued: PO-2026-0801 for 640 LFP Cells',
    date: new Date(Date.now() - 3600000 * 48).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    timestamp: Date.now() - 3600000 * 48,
    snippet: 'Dear Rajesh, Please find attached formal PO-2026-0801 for 640 units of 3.2V 100Ah LFP Grade A cells for immediate dispatch...',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #073642; line-height: 1.6;">
        <p>Dear Rajesh,</p>
        <p>Please find attached our formal Purchase Order <strong>PO-2026-0801</strong> for 640 units of 3.2V 100Ah LFP Grade A cells.</p>
        <p>Please confirm delivery to Pune plant location.</p>
        <br/>
        <p>Best regards,<br/>Procurement Department | Cosmo Cnergy</p>
      </div>
    `,
    isUnread: false,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        filename: 'PO-2026-0801_CosmoCnergy.pdf',
        size: '198 KB',
        type: 'application/pdf'
      }
    ]
  }
];

export const Webmail: React.FC<Props> = ({
  currentUser,
  onOpenAuth,
  initialCompose,
  onSendSuccess,
  mailDraftQueue = [],
  onPopMailDraftQueue,
  onClearMailDraftQueue,
  onClearInitialCompose
}) => {
  const [accounts, setAccounts] = useState<WebmailAccount[]>(() => {
    const saved = localStorage.getItem('cosmo_webmail_accounts');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  const [activeAccountEmail, setActiveAccountEmail] = useState<string>(
    accounts[0]?.email || 'procurement@cosmocnergy.com'
  );

  const [emails, setEmails] = useState<EmailMessage[]>(() => {
    const saved = localStorage.getItem('cosmo_webmail_emails');
    return saved ? JSON.parse(saved) : INITIAL_EMAILS;
  });

  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'starred' | 'drafts' | 'trash'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachment, setComposeAttachment] = useState<EmailAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Helper to safely reset and close compose state
  const handleCloseCompose = () => {
    setIsComposeOpen(false);
    setComposeTo('');
    setComposeCc('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachment(null);
  };

  // Clean up compose state on unmount to prevent persistent stale drafts
  useEffect(() => {
    return () => {
      handleCloseCompose();
    };
  }, []);

  // Listen to deep initialCompose routing and immediately clear from parent to avoid re-opening
  useEffect(() => {
    if (initialCompose) {
      if (initialCompose.to) setComposeTo(initialCompose.to);
      if (initialCompose.subject) setComposeSubject(initialCompose.subject);
      if (initialCompose.body) setComposeBody(initialCompose.body);
      setIsComposeOpen(true);
      if (onClearInitialCompose) {
        onClearInitialCompose();
      }
    }
  }, [initialCompose, onClearInitialCompose]);

  // UI Recovery State: Window focus & storage synchronization for pending POs
  const [sessionPendingPOs, setSessionPendingPOs] = useState<QueuedMailDraft[]>(() => {
    try {
      const s = sessionStorage.getItem('cosmo_pending_pos_queue') || localStorage.getItem('cosmo_mail_draft_queue');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const checkPendingQueue = useCallback(() => {
    try {
      const s = sessionStorage.getItem('cosmo_pending_pos_queue') || localStorage.getItem('cosmo_mail_draft_queue');
      if (s) {
        const parsed = JSON.parse(s);
        setSessionPendingPOs(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener('focus', checkPendingQueue);
    window.addEventListener('storage', checkPendingQueue);
    return () => {
      window.removeEventListener('focus', checkPendingQueue);
      window.removeEventListener('storage', checkPendingQueue);
    };
  }, [checkPendingQueue]);

  // Polling / IMAP Sync State
  const [isFetching, setIsFetching] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState<WebmailAccount>(() => accounts[0] || DEFAULT_ACCOUNTS[0]);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Persist Accounts & Emails to localStorage
  useEffect(() => {
    localStorage.setItem('cosmo_webmail_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('cosmo_webmail_emails', JSON.stringify(emails));
  }, [emails]);

  // Load Accounts from Supabase if configured
  useEffect(() => {
    const loadSupabaseAccounts = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data, error } = await supabase
          .from('webmail_accounts')
          .select('*')
          .order('is_default', { ascending: false });

        if (data && data.length > 0) {
          const mapped: WebmailAccount[] = data.map(d => ({
            id: d.id,
            email: d.email,
            senderName: d.sender_name || 'Procurement',
            imapHost: d.imap_host || 'mail.cosmocnergy.com',
            imapPort: d.imap_port || 993,
            smtpHost: d.smtp_host || 'mail.cosmocnergy.com',
            smtpPort: d.smtp_port || 465,
            username: d.auth_username || d.email,
            password: d.auth_password || '',
            isDefault: d.is_default
          }));
          setAccounts(mapped);
          if (mapped[0]) setActiveAccountEmail(mapped[0].email);
        }
      } catch (err) {
        console.warn('Could not load webmail accounts from Supabase:', err);
      }
    };

    loadSupabaseAccounts();
  }, []);

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.email === activeAccountEmail) || accounts[0] || DEFAULT_ACCOUNTS[0];
  }, [accounts, activeAccountEmail]);

  // Filtered Emails according to active folder and search query
  const filteredEmails = useMemo(() => {
    return emails.filter(m => {
      const matchesAccount = m.accountEmail === activeAccount.email;
      let matchesFolder = true;

      if (activeFolder === 'starred') {
        matchesFolder = m.isStarred === true;
      } else if (activeFolder === 'inbox') {
        matchesFolder = m.folder === 'inbox';
      } else if (activeFolder === 'sent') {
        matchesFolder = m.folder === 'sent';
      } else if (activeFolder === 'drafts') {
        matchesFolder = m.folder === 'drafts';
      } else if (activeFolder === 'trash') {
        matchesFolder = m.folder === 'trash';
      }

      const matchesSearch =
        searchQuery === '' ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.snippet.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesAccount && matchesFolder && matchesSearch;
    });
  }, [emails, activeAccount, activeFolder, searchQuery]);

  const selectedEmail = useMemo(() => {
    return emails.find(e => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, selectedEmailId, filteredEmails]);

  const unreadCount = useMemo(() => {
    return emails.filter(e => e.accountEmail === activeAccount.email && e.folder === 'inbox' && e.isUnread).length;
  }, [emails, activeAccount]);

  // IMAP Live Mail Polling & Backend Integration
  const handleFetchMail = async () => {
    setIsFetching(true);
    setSyncStatus(`Connecting to ${activeAccount.imapHost || 'IMAP'} SSL Server (Port ${activeAccount.imapPort || 993})...`);

    try {
      const response = await fetch('/api/webmail-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: activeAccount,
          folder: activeFolder
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        if (data.emails && Array.isArray(data.emails) && data.emails.length > 0) {
          setEmails(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEmails = data.emails.filter((e: any) => !existingIds.has(e.id));
            return [...newEmails, ...prev];
          });
          setSyncStatus(`Sync complete! ${data.emails.length} new messages retrieved.`);
        } else {
          setSyncStatus(`Inbox is up to date (0 new messages on ${activeAccount.imapHost}).`);
        }
      } else {
        setSyncStatus(`IMAP sync status: ${data.error || data.message || 'No new server messages'}`);
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
      setSyncStatus(`IMAP sync notice: ${e?.message || 'Server unreachable'}`);
    } finally {
      setTimeout(() => {
        setIsFetching(false);
        setSyncStatus(null);
      }, 3500);
    }
  };

  // Test IMAP Connection Handshake
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);

    try {
      const response = await fetch('/api/webmail-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: settingsForm,
          mode: 'test'
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setConnTestResult({
          success: true,
          message: data.message || `Connected to ${settingsForm.imapHost}:${settingsForm.imapPort} successfully!`
        });
      } else {
        setConnTestResult({
          success: false,
          message: data.error || data.message || 'Connection failed. Please check host, port, and credentials.'
        });
      }
    } catch (e: any) {
      setConnTestResult({
        success: false,
        message: e?.message || `Failed to connect to ${settingsForm.imapHost}:${settingsForm.imapPort}. Verify server settings.`
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Save Settings to Local State & Supabase
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === settingsForm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = settingsForm;
        return next;
      }
      return [...prev, settingsForm];
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('webmail_accounts').upsert({
          id: settingsForm.id,
          username: currentUser || 'admin',
          email: settingsForm.email,
          sender_name: settingsForm.senderName,
          imap_host: settingsForm.imapHost,
          imap_port: settingsForm.imapPort,
          smtp_host: settingsForm.smtpHost,
          smtp_port: settingsForm.smtpPort,
          auth_username: settingsForm.username,
          auth_password: settingsForm.password,
          is_default: settingsForm.isDefault || false,
          updated_at: Date.now()
        });
      } catch (err) {
        console.error('Supabase save error:', err);
      }
    }

    setIsSettingsOpen(false);
  };

  // Add New Mail Account
  const handleCreateAccount = (newAcc: WebmailAccount) => {
    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountEmail(newAcc.email);
    setIsAddAccountOpen(false);
  };

  // Toggle Star
  const handleToggleStar = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails(prev =>
      prev.map(mail => (mail.id === emailId ? { ...mail, isStarred: !mail.isStarred } : mail))
    );
  };

  // Mark as Read
  const handleSelectEmail = (mail: EmailMessage) => {
    setSelectedEmailId(mail.id);
    if (mail.isUnread) {
      setEmails(prev =>
        prev.map(item => (item.id === mail.id ? { ...item, isUnread: false } : item))
      );
    }
  };

  // Delete / Trash email
  const handleDeleteEmail = (emailId: string) => {
    setEmails(prev =>
      prev.map(mail => {
        if (mail.id === emailId) {
          return { ...mail, folder: mail.folder === 'trash' ? 'inbox' : 'trash' };
        }
        return mail;
      })
    );
  };

  // Send Mail Dispatcher
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;

    setIsSending(true);

    const newMail: EmailMessage = {
      id: `sent-${Date.now()}`,
      accountEmail: activeAccount.email,
      folder: 'sent',
      from: `${activeAccount.senderName} <${activeAccount.email}>`,
      to: composeTo,
      cc: composeCc,
      subject: composeSubject,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      timestamp: Date.now(),
      snippet: composeBody.substring(0, 120),
      bodyHtml: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #073642; line-height: 1.6;">${composeBody.replace(/\n/g, '<br/>')}</div>`,
      isUnread: false,
      isStarred: false,
      hasAttachments: Boolean(composeAttachment),
      attachments: composeAttachment ? [composeAttachment] : []
    };

    try {
      const response = await fetch('/api/webmail-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: activeAccount,
          to: composeTo,
          cc: composeCc,
          subject: composeSubject,
          html: newMail.bodyHtml,
          text: composeBody,
          attachmentBase64: composeAttachment?.dataBase64,
          attachmentName: composeAttachment?.filename
        })
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok && resData.success) {
        setEmails(prev => [newMail, ...prev]);
        if (onSendSuccess && initialCompose?.orderToConfirm) {
          onSendSuccess(initialCompose.orderToConfirm);
        }
        alert(resData.message || `Email dispatched to ${composeTo}!`);
      } else {
        console.warn('SMTP transport dispatch warning:', resData);
        alert(`SMTP Dispatch Notice: ${resData.error || resData.message || 'Check mailbox credentials in settings.'}`);
        setEmails(prev => [newMail, ...prev]);
      }
    } catch (e: any) {
      console.warn('Local SMTP dispatch error:', e);
      alert(`Email dispatch error: ${e?.message || 'Could not connect to SMTP server.'}`);
      setEmails(prev => [newMail, ...prev]);
    } finally {
      setIsSending(false);
      handleCloseCompose();

      // Auto-load next draft in queue if available
      if (mailDraftQueue && mailDraftQueue.length > 0) {
        const next = mailDraftQueue[0];
        if (onPopMailDraftQueue) {
          onPopMailDraftQueue(next.id);
        }
        setTimeout(() => {
          setComposeTo(next.to);
          setComposeSubject(next.subject);
          setComposeBody(next.body);
          setIsComposeOpen(true);
        }, 400);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Account Management Bar */}
      <div className="glass-panel p-6 rounded-3xl bg-[#0B192C] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Admin Webmail Client</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                IMAP / SMTP SSL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Multi-account enterprise inbox with live IMAP polling, SMTP email drafting, and Supabase auth persistence.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Selector Dropdown */}
          <div className="relative">
            <select
              value={activeAccountEmail}
              onChange={e => {
                setActiveAccountEmail(e.target.value);
                const found = accounts.find(a => a.email === e.target.value);
                if (found) setSettingsForm({ ...found });
              }}
              className="appearance-none bg-[#12243d] hover:bg-[#1a3150] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.email}>
                  {acc.senderName} ({acc.email})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* Add Mailbox Button */}
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-xs active:scale-95"
            title="Connect an additional IMAP/SMTP Mailbox"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Mailbox</span>
          </button>

          {/* Fetch Mail Button */}
          <button
            onClick={handleFetchMail}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-semibold transition-all shadow-xs active:scale-95"
            title="Poll IMAP server for new messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isFetching ? 'Syncing...' : 'Fetch Mail'}</span>
          </button>

          {/* Settings / Edit Button (Gear Icon) */}
          <button
            onClick={() => {
              setSettingsForm({ ...activeAccount });
              setConnTestResult(null);
              setIsSettingsOpen(true);
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shadow-xs active:scale-95"
            title="IMAP / SMTP Server Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Compose Mail Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4 fill-white" />
            <span>Compose Mail</span>
          </button>
        </div>
      </div>

      {/* Multi-Vendor PO Drafts Active Queue & Continue Dispatching Recovery Banner */}
      {/* Handled by global MailQueueManager now */}

      {syncStatus && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs animate-fadeIn font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Main 3-Pane Webmail Interface (Solarized Light Theme) */}
      <div className="glass-card bg-[#FDF6E3] rounded-3xl border border-[#D6D1B1] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* Left Folder Sidebar (3 Cols) */}
        <div className="lg:col-span-3 bg-[#EEE8D5] p-4 border-r border-[#D6D1B1] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Compose Quick Trigger */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5 fill-white" />
              <span>Write New Mail</span>
            </button>

            {/* Folder Links */}
            <nav className="space-y-1 text-xs font-semibold">
              <button
                onClick={() => setActiveFolder('inbox')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeFolder === 'inbox'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-[#073642] hover:bg-[#E4DDC7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeFolder === 'inbox' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFolder('starred')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeFolder === 'starred'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-[#073642] hover:bg-[#E4DDC7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4" />
                  <span>Starred</span>
                </div>
                <span className="text-[#586E75] font-mono text-[11px]">
                  {emails.filter(e => e.isStarred && e.accountEmail === activeAccount.email).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('sent')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeFolder === 'sent'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-[#073642] hover:bg-[#E4DDC7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Sent Mail</span>
                </div>
                <span className="text-[#586E75] font-mono text-[11px]">
                  {emails.filter(e => e.folder === 'sent' && e.accountEmail === activeAccount.email).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('drafts')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeFolder === 'drafts'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-[#073642] hover:bg-[#E4DDC7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Drafts</span>
                </div>
                <span className="text-[#586E75] font-mono text-[11px]">
                  {emails.filter(e => e.folder === 'drafts' && e.accountEmail === activeAccount.email).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('trash')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeFolder === 'trash'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-[#073642] hover:bg-[#E4DDC7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Trash</span>
                </div>
                <span className="text-[#586E75] font-mono text-[11px]">
                  {emails.filter(e => e.folder === 'trash' && e.accountEmail === activeAccount.email).length}
                </span>
              </button>
            </nav>
          </div>

          {/* Account Status Footer */}
          <div className="pt-4 border-t border-[#D6D1B1] text-[11px] text-[#586E75] space-y-1">
            <div className="flex items-center gap-1.5 text-[#073642] font-bold">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">{activeAccount.email}</span>
            </div>
            <div className="text-[10px] text-[#586E75]">
              IMAP: {activeAccount.imapHost}:{activeAccount.imapPort}
            </div>
          </div>
        </div>

        {/* Middle Email List Pane (4 Cols) */}
        <div className="lg:col-span-4 border-r border-[#D6D1B1] flex flex-col bg-[#FDF6E3]">
          {/* Universal Search Header */}
          <div className="p-3.5 border-b border-[#D6D1B1]/60 bg-[#EEE8D5]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#586E75] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search mail by sender, subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 shadow-xs font-medium placeholder-[#586E75]"
              />
            </div>
          </div>

          {/* Email Items List */}
          <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-[#D6D1B1]/40">
            {filteredEmails.length === 0 ? (
              <div className="p-10 text-center text-[#586E75] text-xs">
                <Mail className="w-8 h-8 text-[#93A1A1] mx-auto mb-2 opacity-50" />
                <p>No emails found in this folder.</p>
              </div>
            ) : (
              filteredEmails.map(mail => {
                const isSelected = selectedEmail?.id === mail.id;
                return (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectEmail(mail)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600'
                        : mail.isUnread
                        ? 'bg-[#FDF6E3] hover:bg-[#EEE8D5] font-semibold'
                        : 'bg-[#FAF4E6] hover:bg-[#EEE8D5] text-[#586E75]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {mail.isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <span className={`text-xs truncate ${mail.isUnread ? 'font-bold text-[#073642]' : 'text-[#586E75]'}`}>
                          {mail.from.split('<')[0].trim() || mail.from}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {mail.hasAttachments && (
                          <Paperclip className="w-3 h-3 text-[#586E75]" />
                        )}
                        <button
                          onClick={e => handleToggleStar(mail.id, e)}
                          className="text-[#93A1A1] hover:text-amber-500 transition-colors"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              mail.isStarred ? 'text-amber-500 fill-amber-500' : ''
                            }`}
                          />
                        </button>
                        <span className="text-[10px] text-[#586E75] font-mono">
                          {mail.date.split(',')[0]}
                        </span>
                      </div>
                    </div>

                    <h4 className={`text-xs truncate ${mail.isUnread ? 'font-bold text-[#073642]' : 'text-[#586E75]'}`}>
                      {mail.subject}
                    </h4>

                    <p className="text-[11px] text-[#586E75] line-clamp-1 mt-0.5">
                      {mail.snippet}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Reading Pane (5 Cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-[#FDF6E3] overflow-y-auto max-h-[680px] text-[#073642]">
          {selectedEmail ? (
            <div className="space-y-6">
              {/* Email View Header */}
              <div className="border-b border-[#D6D1B1]/60 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#073642] font-sans leading-tight">
                    {selectedEmail.subject}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => handleToggleStar(selectedEmail.id, e)}
                      className="p-1.5 rounded-lg text-[#586E75] hover:text-amber-500 transition-colors"
                      title="Star email"
                    >
                      <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      className="p-1.5 rounded-lg text-[#586E75] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete / Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#586E75] pt-1">
                  <div>
                    <div>
                      From: <span className="font-bold text-[#073642]">{selectedEmail.from}</span>
                    </div>
                    <div className="text-[#586E75] text-[11px]">
                      To: {selectedEmail.to} {selectedEmail.cc ? `• CC: ${selectedEmail.cc}` : ''}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#586E75] font-mono text-right">
                    {selectedEmail.date}
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2">
                  <div className="text-[11px] font-bold text-[#586E75] uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attachments ({selectedEmail.attachments.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FDF6E3] border border-[#D6D1B1] text-xs text-[#073642] shadow-2xs hover:border-emerald-500 transition-all cursor-pointer font-medium"
                        onClick={() => alert(`Downloading attachment: ${att.filename}`)}
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate max-w-[140px]">{att.filename}</span>
                        <span className="text-[10px] text-[#586E75] font-mono">({att.size})</span>
                        <Download className="w-3 h-3 text-[#586E75] hover:text-[#073642]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Body HTML */}
              <div
                className="prose prose-sm max-w-none text-[#073642] text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
              />

              {/* Quick Reply / Forward Actions */}
              <div className="pt-6 border-t border-[#D6D1B1]/60 flex items-center gap-3">
                <button
                  onClick={() => {
                    setComposeTo(selectedEmail.from.includes('<') ? selectedEmail.from.split('<')[1].replace('>', '') : selectedEmail.from);
                    setComposeSubject(`Re: ${selectedEmail.subject}`);
                    setComposeBody(`\n\n--- On ${selectedEmail.date}, ${selectedEmail.from} wrote:\n> ${selectedEmail.snippet}`);
                    setIsComposeOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold text-xs transition-all active:scale-95 border border-[#D6D1B1]"
                >
                  <Reply className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reply</span>
                </button>

                <button
                  onClick={() => {
                    setComposeSubject(`Fwd: ${selectedEmail.subject}`);
                    setComposeBody(`\n\n--- Forwarded Message ---\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.snippet}`);
                    setIsComposeOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold text-xs transition-all active:scale-95 border border-[#D6D1B1]"
                >
                  <Forward className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Forward</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#586E75]">
              <Mail className="w-12 h-12 text-[#93A1A1] mb-3" />
              <p className="text-xs">Select an email message from the list to read its contents.</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings / Edit Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-[#073642]">Webmail IMAP & SMTP Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-[#586E75] hover:text-[#073642] font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={settingsForm.email}
                    onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Sender Display Name *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.senderName}
                    onChange={e => setSettingsForm({ ...settingsForm, senderName: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">IMAP Host (Incoming) *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.imapHost}
                    onChange={e => setSettingsForm({ ...settingsForm, imapHost: e.target.value })}
                    placeholder="mail.cosmocnergy.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">IMAP Port (SSL) *</label>
                  <input
                    type="number"
                    required
                    value={settingsForm.imapPort}
                    onChange={e => setSettingsForm({ ...settingsForm, imapPort: Number(e.target.value) || 993 })}
                    placeholder="993"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">SMTP Host (Outgoing) *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.smtpHost}
                    onChange={e => setSettingsForm({ ...settingsForm, smtpHost: e.target.value })}
                    placeholder="mail.cosmocnergy.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">SMTP Port (SSL) *</label>
                  <input
                    type="number"
                    required
                    value={settingsForm.smtpPort}
                    onChange={e => setSettingsForm({ ...settingsForm, smtpPort: Number(e.target.value) || 465 })}
                    placeholder="465"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Mail Login Username *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.username}
                    onChange={e => setSettingsForm({ ...settingsForm, username: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Email Password / Secret *</label>
                  <input
                    type="password"
                    value={settingsForm.password || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {connTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    connTestResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  {connTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{connTestResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConn}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold text-xs border border-[#D6D1B1]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                  <span>{isTestingConn ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold text-xs hover:bg-[#E4DDC7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Mailbox Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <h3 className="text-xl font-bold text-[#073642] flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Connect New Mailbox</span>
              </h3>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-[#586E75] hover:text-[#073642] font-bold">
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const form = e.target as any;
                handleCreateAccount({
                  id: `acc-${Date.now()}`,
                  email: form.email.value,
                  senderName: form.senderName.value,
                  imapHost: form.imapHost.value,
                  imapPort: Number(form.imapPort.value) || 993,
                  smtpHost: form.smtpHost.value,
                  smtpPort: Number(form.smtpPort.value) || 465,
                  username: form.username.value,
                  password: form.password.value
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. operations@cosmocnergy.com"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Sender Name *</label>
                <input
                  name="senderName"
                  type="text"
                  required
                  placeholder="e.g. CosmoCnergy Operations"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">IMAP Host</label>
                  <input
                    name="imapHost"
                    type="text"
                    defaultValue="mail.cosmocnergy.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">IMAP Port</label>
                  <input
                    name="imapPort"
                    type="number"
                    defaultValue={993}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">SMTP Host</label>
                  <input
                    name="smtpHost"
                    type="text"
                    defaultValue="mail.cosmocnergy.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">SMTP Port</label>
                  <input
                    name="smtpPort"
                    type="number"
                    defaultValue={465}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Username *</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="user@domain.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Password *</label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20"
                >
                  Connect Mailbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compose Mail Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-2xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-[#073642]">Compose New Message</h3>
              </div>
              <button onClick={handleCloseCompose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMail} className="space-y-3 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] text-[#073642]">
                <span className="font-semibold text-[#586E75]">From:</span>
                <span className="font-bold text-[#073642]">{activeAccount.senderName}</span>
                <span className="text-[#586E75] font-mono text-[11px]">({activeAccount.email})</span>
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">To: Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  placeholder="vendor.sales@company.com"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">CC (Optional)</label>
                <input
                  type="text"
                  value={composeCc}
                  onChange={e => setComposeCc(e.target.value)}
                  placeholder="procurement-lead@cosmocnergy.com"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Purchase Order (PO) - 51.2V 100Ah Pack Assembly"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Email Body *</label>
                <textarea
                  rows={8}
                  required
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Type your official procurement dispatch message or quotation inquiry here..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* Attachment Picker */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1]">
                <div className="flex items-center gap-2 text-[#586E75]">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  {composeAttachment ? (
                    <span className="font-bold text-[#073642]">{composeAttachment.filename} ({composeAttachment.size})</span>
                  ) : (
                    <span className="text-[#586E75]">No file attached</span>
                  )}
                </div>

                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#FDF6E3] border border-[#D6D1B1] hover:border-emerald-500 text-[#073642] font-semibold text-xs transition-all shadow-2xs">
                  <span>Attach PDF / Specs</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setComposeAttachment({
                          filename: file.name,
                          size: `${(file.size / 1024).toFixed(1)} KB`,
                          type: file.type
                        });
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={handleCloseCompose}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold text-xs hover:bg-[#E4DDC7]"
                >
                  Discard Draft
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>{isSending ? 'Sending via SMTP...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
