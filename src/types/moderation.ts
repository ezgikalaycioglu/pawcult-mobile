export type ReportContentType =
  | 'user'
  | 'pet'
  | 'dog_park'
  | 'dog_park_checkin'
  | 'friend_profile';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type CreateUserReportInput = {
  contentType: ReportContentType;
  contentId: string | null;
  reportedUserId: string | null;
  reason: string;
  details?: string;
};

export type BlockedUser = {
  blockedUserId: string;
  displayName: string;
  email: string | null;
  blockedAt: string;
};

export type AdminReport = {
  id: string;
  reporterUserId: string;
  reporterEmail: string | null;
  reportedUserId: string | null;
  reportedEmail: string | null;
  contentType: ReportContentType;
  contentId: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};
