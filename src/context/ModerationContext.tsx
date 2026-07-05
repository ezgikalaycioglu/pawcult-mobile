import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import {
  AdminReport,
  BlockedUser,
  CreateUserReportInput,
  ReportStatus,
} from '../types/moderation';
import { useAuth } from './AuthContext';

type ModerationContextType = {
  adminReports: AdminReport[];
  blockUser: (targetUserId: string) => Promise<void>;
  blockedUsers: BlockedUser[];
  createUserReport: (input: CreateUserReportInput) => Promise<void>;
  fetchAdminReports: (status?: ReportStatus | 'all') => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  isAdmin: boolean;
  loadingAdminReports: boolean;
  loadingBlockedUsers: boolean;
  refreshAdminStatus: () => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  updateAdminReport: (
    reportId: string,
    status: ReportStatus,
    adminNote?: string
  ) => Promise<void>;
};

type AdminReportRow = {
  id: string;
  reporter_user_id: string;
  reporter_email: string | null;
  reported_user_id: string | null;
  reported_email: string | null;
  content_type: AdminReport['contentType'];
  content_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type BlockedUserRow = {
  blocked_user_id: string;
  display_name: string;
  email: string | null;
  blocked_at: string;
};

const ModerationContext = createContext<ModerationContextType | undefined>(
  undefined
);

const mapAdminReportRow = (row: AdminReportRow): AdminReport => ({
  id: row.id,
  reporterUserId: row.reporter_user_id,
  reporterEmail: row.reporter_email,
  reportedUserId: row.reported_user_id,
  reportedEmail: row.reported_email,
  contentType: row.content_type,
  contentId: row.content_id,
  reason: row.reason,
  details: row.details,
  status: row.status,
  adminNote: row.admin_note,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
});

const mapBlockedUserRow = (row: BlockedUserRow): BlockedUser => ({
  blockedUserId: row.blocked_user_id,
  displayName: row.display_name,
  email: row.email,
  blockedAt: row.blocked_at,
});

export const ModerationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingAdminReports, setLoadingAdminReports] = useState(false);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);

  const refreshAdminStatus = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false);
      setAdminReports([]);
      return;
    }

    const { data, error } = await supabase.rpc('is_app_admin');

    if (error) {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(Boolean(data));
  }, [user?.id]);

  useEffect(() => {
    void refreshAdminStatus();
  }, [refreshAdminStatus]);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) {
      setBlockedUsers([]);
      return;
    }

    setLoadingBlockedUsers(true);

    try {
      const { data, error } = await supabase.rpc('get_my_blocked_users');

      if (error) {
        throw error;
      }

      setBlockedUsers(
        ((data ?? []) as BlockedUserRow[]).map(mapBlockedUserRow)
      );
    } finally {
      setLoadingBlockedUsers(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchBlockedUsers().catch(() => {
      setBlockedUsers([]);
    });
  }, [fetchBlockedUsers]);

  const createUserReport = async (input: CreateUserReportInput) => {
    if (!user?.id) {
      throw new Error('User session is required to submit a report.');
    }

    const { error } = await supabase.rpc('create_user_report', {
      content_id: input.contentId,
      content_type: input.contentType,
      details: input.details ?? null,
      reason: input.reason,
      reported_user_id: input.reportedUserId,
    });

    if (error) {
      throw error;
    }
  };

  const blockUser = async (targetUserId: string) => {
    if (!user?.id) {
      throw new Error('User session is required to block a user.');
    }

    const { error } = await supabase.rpc('block_user', {
      target_user_id: targetUserId,
    });

    if (error) {
      throw error;
    }

    await fetchBlockedUsers();
  };

  const unblockUser = async (targetUserId: string) => {
    if (!user?.id) {
      throw new Error('User session is required to unblock a user.');
    }

    const { error } = await supabase.rpc('unblock_user', {
      target_user_id: targetUserId,
    });

    if (error) {
      throw error;
    }

    await fetchBlockedUsers();
  };

  const fetchAdminReports = async (status: ReportStatus | 'all' = 'open') => {
    if (!isAdmin) {
      setAdminReports([]);
      return;
    }

    setLoadingAdminReports(true);

    try {
      const { data, error } = await supabase.rpc('get_admin_reports', {
        status_filter: status,
      });

      if (error) {
        throw error;
      }

      setAdminReports(
        ((data ?? []) as AdminReportRow[]).map(mapAdminReportRow)
      );
    } finally {
      setLoadingAdminReports(false);
    }
  };

  const updateAdminReport = async (
    reportId: string,
    status: ReportStatus,
    adminNote = ''
  ) => {
    if (!isAdmin) {
      throw new Error('Admin access is required.');
    }

    const { error } = await supabase.rpc('update_admin_report', {
      next_admin_note: adminNote,
      next_status: status,
      report_id: reportId,
    });

    if (error) {
      throw error;
    }
  };

  const value = useMemo<ModerationContextType>(
    () => ({
      adminReports,
      blockUser,
      blockedUsers,
      createUserReport,
      fetchAdminReports,
      fetchBlockedUsers,
      isAdmin,
      loadingAdminReports,
      loadingBlockedUsers,
      refreshAdminStatus,
      unblockUser,
      updateAdminReport,
    }),
    [
      adminReports,
      blockedUsers,
      fetchBlockedUsers,
      isAdmin,
      loadingAdminReports,
      loadingBlockedUsers,
      refreshAdminStatus,
      user?.id,
    ]
  );

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
};

export const useModeration = () => {
  const context = useContext(ModerationContext);

  if (!context) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }

  return context;
};
