/**
 * Types et helpers fetch pour les demandes d'accès bêta et la liste de diffusion.
 * Le POST public est anonyme ; tout le reste est admin-only (session cookie).
 */

export interface AccessRequest {
  id: number;
  email: string;
  name: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  mailing_opt_in: number;
  invite_code: string | null;
  read: number;
  created_at: number;
  processed_at: number | null;
}

export interface MailingSubscriber {
  email: string;
  subscribed_at: number;
  source: 'access_request' | 'admin';
  active: number;
}

export async function submitAccessRequest(data: {
  email: string;
  name?: string;
  message?: string;
  mailingOptIn: boolean;
  website?: string;
}): Promise<void> {
  const r = await fetch('/api/v1/access-requests', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminListRequests(status?: string, unreadOnly?: boolean): Promise<AccessRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (unreadOnly) params.set('unread', '1');
  const query = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch(`/api/v1/admin/access-requests${query}`, {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {requests: AccessRequest[]}).requests;
}

export async function adminPatchRequest(id: number, patch: {read: boolean}): Promise<void> {
  const r = await fetch(`/api/v1/admin/access-requests/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminApproveRequest(id: number): Promise<string> {
  const r = await fetch(`/api/v1/admin/access-requests/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {inviteCode: string}).inviteCode;
}

export async function adminRejectRequest(id: number): Promise<void> {
  const r = await fetch(`/api/v1/admin/access-requests/${id}/reject`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminDeleteRequest(id: number): Promise<void> {
  const r = await fetch(`/api/v1/admin/access-requests/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminListMailing(): Promise<MailingSubscriber[]> {
  const r = await fetch('/api/v1/admin/mailing-list', {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {subscribers: MailingSubscriber[]}).subscribers;
}

export async function adminAddSubscriber(email: string): Promise<void> {
  const r = await fetch('/api/v1/admin/mailing-list', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminSetSubscriberActive(email: string, active: boolean): Promise<void> {
  const r = await fetch(`/api/v1/admin/mailing-list/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({active}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function adminDeleteSubscriber(email: string): Promise<void> {
  const r = await fetch(`/api/v1/admin/mailing-list/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
