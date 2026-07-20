"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, ShieldCheck, Trash2, UserPlus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { adminErrorText, formatAdminText, useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  claimUsername,
  deleteAdminProfile,
  isUsernameAvailable,
  listAdminProfiles,
  releaseUsername,
  saveAdminProfile,
  setAdminProfileDisabled,
  setMainAdmin
} from "@/lib/firebase/firestore";
import { createStaffAuthUser, deleteStaffAccount } from "@/lib/firebase/user-admin";
import { ADMIN_FEATURES, emptyPermissions, roleOf } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils/cn";
import { normalizeSearch } from "@/lib/utils/format";
import type { AdminPermissions, AdminProfile, AdminRole } from "@/types/models";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;

export function UserManager() {
  const { text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AdminProfile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // Add-user form state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AdminRole>("employee");
  const [permissions, setPermissions] = useState<AdminPermissions>(emptyPermissions);

  async function refresh() {
    setUsers(await listAdminProfiles());
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEmail("");
    setUsername("");
    setPassword("");
    setDisplayName("");
    setRole("employee");
    setPermissions(emptyPermissions());
  }

  async function handleCreate() {
    setMessage("");
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(text.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(text.weakPassword);
      return;
    }
    if (cleanUsername && !USERNAME_PATTERN.test(cleanUsername)) {
      setError(text.usernameInvalid);
      return;
    }
    if (cleanUsername && !(await isUsernameAvailable(cleanUsername))) {
      setError(text.usernameTaken);
      return;
    }

    setSaving(true);
    try {
      const uid = await createStaffAuthUser(trimmedEmail, password);
      await saveAdminProfile({
        uid,
        email: trimmedEmail,
        username: cleanUsername || undefined,
        role,
        permissions,
        displayName: displayName.trim() || undefined
      });
      let mappingFailed = false;
      if (cleanUsername) {
        try {
          await claimUsername(cleanUsername, trimmedEmail, uid);
        } catch {
          mappingFailed = true;
        }
      }
      await refresh();
      resetForm();
      setCreateOpen(false);
      setMessage(mappingFailed ? text.deployRulesForUsername : text.userCreated);
    } catch (err) {
      setError(mapAuthError(err, text));
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername(profile: AdminProfile, rawUsername: string) {
    setMessage("");
    setError("");
    const next = rawUsername.trim().toLowerCase();
    const previous = profile.username || "";
    if (next === previous) return;
    if (next && !USERNAME_PATTERN.test(next)) {
      setError(text.usernameInvalid);
      return;
    }
    if (next && !(await isUsernameAvailable(next, profile.uid))) {
      setError(text.usernameTaken);
      return;
    }

    setUsers((current) => current.map((entry) => (entry.uid === profile.uid ? { ...entry, username: next || undefined } : entry)));
    try {
      await saveAdminProfile({
        uid: profile.uid,
        email: profile.email,
        role: roleOf(profile),
        permissions: profile.permissions ?? emptyPermissions(),
        username: next || undefined,
        displayName: profile.displayName,
        disabled: profile.disabled
      });
      let mappingFailed = false;
      try {
        if (previous && previous !== next) await releaseUsername(previous);
        if (next) await claimUsername(next, profile.email, profile.uid);
      } catch {
        mappingFailed = true;
      }
      setMessage(mappingFailed ? text.deployRulesForUsername : text.usernameSaved);
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    }
  }

  async function updateUser(profile: AdminProfile, changes: { role?: AdminRole; permissions?: AdminPermissions }) {
    setMessage("");
    setError("");
    const nextRole = changes.role ?? roleOf(profile);
    const nextPermissions = changes.permissions ?? profile.permissions ?? emptyPermissions();
    setUsers((current) =>
      current.map((entry) =>
        entry.uid === profile.uid ? { ...entry, role: nextRole, permissions: nextPermissions } : entry
      )
    );
    try {
      await saveAdminProfile({
        uid: profile.uid,
        email: profile.email,
        role: nextRole,
        permissions: nextPermissions,
        displayName: profile.displayName,
        disabled: profile.disabled
      });
      setMessage(text.userUpdated);
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    }
  }

  async function toggleDisabled(profile: AdminProfile, disabled: boolean) {
    setMessage("");
    setError("");
    setUsers((current) => current.map((entry) => (entry.uid === profile.uid ? { ...entry, disabled } : entry)));
    try {
      await setAdminProfileDisabled(profile.uid, disabled, profile.displayName || profile.username || profile.email);
      setMessage(text.userUpdated);
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    }
  }

  // Grant/revoke the cafe's Main Admin (owner) flag — only a current Main Admin
  // sees this control, and it can't be toggled on yourself (avoids self-lockout).
  async function toggleMainAdmin(profile: AdminProfile, isMainAdmin: boolean) {
    setMessage("");
    setError("");
    setUsers((current) => current.map((entry) => (entry.uid === profile.uid ? { ...entry, isMainAdmin } : entry)));
    try {
      await setMainAdmin(profile.uid, isMainAdmin, profile.displayName || profile.username || profile.email);
      setMessage(text.userUpdated);
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setSaving(true);
    setMessage("");
    setError("");

    // Best-effort: ask the server to delete the Firebase Auth login so the email
    // is freed for reuse (needs the Admin SDK / FIREBASE_ADMIN_* env vars). A
    // server problem must NEVER block the access + username cleanup below, or the
    // username would stay bound after "deleting" the account.
    let emailFreed = false;
    try {
      emailFreed = await deleteStaffAccount(removeTarget.uid);
    } catch {
      emailFreed = false;
    }

    try {
      // Always revoke access and release the username — even if the Auth delete
      // was unavailable. Deleting already-removed docs is a harmless no-op.
      if (removeTarget.username) await releaseUsername(removeTarget.username).catch(() => {});
      await deleteAdminProfile(removeTarget.uid, removeTarget.displayName || removeTarget.username || removeTarget.email);
      setRemoveTarget(null);
      await refresh();
      setMessage(emailFreed ? text.userRemoved : text.accountDeletePartial);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const sortedUsers = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return users
      .filter((profile) => roleFilter === "all" || roleOf(profile) === roleFilter)
      .filter((profile) => statusFilter === "all" || (statusFilter === "active" ? !profile.disabled : profile.disabled))
      .filter((profile) => {
        if (!normalizedQuery) return true;
        return normalizeSearch([profile.email, profile.displayName || "", profile.username || "", roleOf(profile)].join(" ")).includes(normalizedQuery);
      })
      .sort((a, b) => Number(roleOf(a) === "employee") - Number(roleOf(b) === "employee") || a.email.localeCompare(b.email));
  }, [query, roleFilter, statusFilter, users]);
  const adminCount = users.filter((profile) => roleOf(profile) === "admin").length;
  const employeeCount = users.filter((profile) => roleOf(profile) === "employee").length;
  const disabledCount = users.filter((profile) => profile.disabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.userManagement}</h1>
          <p dir={textDir} className="text-muted-foreground">{text.userManagementDesc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {saving ? <span className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">{text.saving}</span> : null}
          <Button type="button" onClick={() => setCreateOpen((value) => !value)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            {text.addUser}
          </Button>
        </div>
      </div>

      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
      {error ? <p dir={textDir} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{adminErrorText(error, text)}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UserStat label={text.users} value={users.length} />
        <UserStat label={text.roleAdmin} value={adminCount} tone="primary" />
        <UserStat label={text.roleEmployee} value={employeeCount} />
        <UserStat label={text.accountDisabled} value={disabledCount} />
      </div>

      {/* Add user */}
      {createOpen ? (
      <Card className="settings-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden />
            {text.addUser}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={text.email}>
              <Input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label={text.loginSlug}>
              <Input autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. sara" />
              <p dir={textDir} className="mt-1 text-xs text-muted-foreground">{text.usernameHint}</p>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={text.password}>
              <Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label={text.displayName}>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-2" dir={textDir}>
            <span className="text-sm font-medium">{text.role}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <RoleOption
                active={role === "admin"}
                title={text.roleAdmin}
                hint={text.roleAdminHint}
                icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                onClick={() => setRole("admin")}
              />
              <RoleOption
                active={role === "employee"}
                title={text.roleEmployee}
                hint={text.roleEmployeeHint}
                icon={<UserRound className="h-4 w-4" aria-hidden />}
                onClick={() => setRole("employee")}
              />
            </div>
          </div>

          {role === "employee" ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <span dir={textDir} className="text-sm font-medium">{text.employeeAccess}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_FEATURES.map((feature) => (
                  <PermissionRow
                    key={feature}
                    label={text[feature]}
                    checked={permissions[feature] === true}
                    onChange={(checked) => setPermissions((current) => ({ ...current, [feature]: checked }))}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <Button type="button" onClick={handleCreate} disabled={saving}>
            <UserPlus className="h-4 w-4" aria-hidden />
            {text.createUser}
          </Button>
        </CardContent>
      </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input className="ps-9" placeholder={text.searchUsers} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | AdminRole)}>
          <option value="all">{text.allRoles}</option>
          <option value="admin">{text.roleAdmin}</option>
          <option value="employee">{text.roleEmployee}</option>
        </Select>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "disabled")}>
          <option value="all">{text.allStatuses}</option>
          <option value="active">{text.active}</option>
          <option value="disabled">{text.accountDisabled}</option>
        </Select>
      </div>

      {/* Existing users */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : sortedUsers.length ? (
          sortedUsers.map((profile) => (
            <UserRow
              key={profile.uid}
              profile={profile}
              text={text}
              textDir={textDir}
              isSelf={profile.uid === auth.user?.uid}
              viewerIsMainAdmin={auth.isMainAdmin}
              onUpdate={updateUser}
              onToggleDisabled={toggleDisabled}
              onToggleMainAdmin={toggleMainAdmin}
              onSaveUsername={saveUsername}
              onRemove={() => setRemoveTarget(profile)}
            />
          ))
        ) : (
          <p dir={textDir} className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {query || roleFilter !== "all" || statusFilter !== "all" ? text.noMatchingUsers : text.noUsers}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        dir={textDir}
        variant="destructive"
        icon={<Trash2 className="h-5 w-5" aria-hidden />}
        title={text.removeAccess}
        description={removeTarget ? formatAdminText(text.removeAccessConfirm, { email: removeTarget.email }) : ""}
        confirmLabel={text.removeAccess}
        cancelLabel={text.cancel}
        loading={saving}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

function UserStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "primary" }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", tone === "primary" && "border-primary/30 bg-primary/5")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RoleOption({
  active,
  title,
  hint,
  icon,
  onClick
}: {
  active: boolean;
  title: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring rounded-lg border p-3 text-start transition-colors",
        active ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30" : "bg-card hover:bg-muted"
      )}
    >
      <span className={cn("flex items-center gap-2 text-sm font-semibold", active && "text-primary")}>
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function PermissionRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} disabled={disabled} />
    </label>
  );
}

function UserRow({
  profile,
  text,
  textDir,
  isSelf,
  viewerIsMainAdmin,
  onUpdate,
  onToggleDisabled,
  onToggleMainAdmin,
  onSaveUsername,
  onRemove
}: {
  profile: AdminProfile;
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  isSelf: boolean;
  viewerIsMainAdmin: boolean;
  onUpdate: (profile: AdminProfile, changes: { role?: AdminRole; permissions?: AdminPermissions }) => void;
  onToggleDisabled: (profile: AdminProfile, disabled: boolean) => void;
  onToggleMainAdmin: (profile: AdminProfile, isMainAdmin: boolean) => void;
  onSaveUsername: (profile: AdminProfile, username: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile.username || "");
  const role = roleOf(profile);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex w-full items-center gap-3 p-4 text-start"
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
          {role === "admin" ? <ShieldCheck className="h-5 w-5" aria-hidden /> : <UserRound className="h-5 w-5" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{profile.displayName || profile.email}</span>
            <Badge className={role === "admin" ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
              {role === "admin" ? text.roleAdmin : text.roleEmployee}
            </Badge>
            {profile.username ? <Badge>@{profile.username}</Badge> : <Badge className="bg-muted text-muted-foreground">{text.noUsername}</Badge>}
            {profile.isMainAdmin ? <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">{text.mainAdmin}</Badge> : null}
            {isSelf ? <Badge className="border-primary/30 bg-primary/10 text-primary">{text.youLabel}</Badge> : null}
            {profile.disabled ? <Badge className="border-destructive/30 bg-destructive/10 text-destructive">{text.accountDisabled}</Badge> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {profile.email}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <CardContent className="space-y-4 border-t pt-4">
          {isSelf ? (
            <p dir={textDir} className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              {text.cannotEditSelf}
            </p>
          ) : null}

          <Field label={text.loginSlug}>
            <div className="flex gap-2">
              <span className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">@</span>
              <Input value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value)} placeholder="sara" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onSaveUsername(profile, usernameDraft)}
                disabled={usernameDraft.trim().toLowerCase() === (profile.username || "")}
              >
                {text.save}
              </Button>
            </div>
            <p dir={textDir} className="mt-1 text-xs text-muted-foreground">{text.usernameHint}</p>
          </Field>

          <div className="grid gap-2" dir={textDir}>
            <span className="text-sm font-medium">{text.role}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <RoleOption
                active={role === "admin"}
                title={text.roleAdmin}
                hint={text.roleAdminHint}
                icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                onClick={() => !isSelf && onUpdate(profile, { role: "admin" })}
              />
              <RoleOption
                active={role === "employee"}
                title={text.roleEmployee}
                hint={text.roleEmployeeHint}
                icon={<UserRound className="h-4 w-4" aria-hidden />}
                onClick={() => !isSelf && onUpdate(profile, { role: "employee" })}
              />
            </div>
          </div>

          {role === "employee" ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <span dir={textDir} className="text-sm font-medium">{text.employeeAccess}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_FEATURES.map((feature) => (
                  <PermissionRow
                    key={feature}
                    label={text[feature]}
                    checked={profile.permissions?.[feature] === true}
                    disabled={isSelf}
                    onChange={(checked) =>
                      onUpdate(profile, {
                        permissions: { ...(profile.permissions ?? emptyPermissions()), [feature]: checked }
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <p dir={textDir} className="text-sm text-muted-foreground">{text.fullAccess}</p>
          )}

          {viewerIsMainAdmin ? (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <span className="min-w-0" dir={textDir}>
                <span className="block text-sm font-medium">{text.mainAdmin}</span>
                <span className="block text-xs text-muted-foreground">{text.mainAdminHint}</span>
              </span>
              <Switch
                checked={profile.isMainAdmin === true}
                onCheckedChange={(checked) => onToggleMainAdmin(profile, checked)}
                label={text.mainAdmin}
                disabled={isSelf}
              />
            </label>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!profile.disabled}
                onCheckedChange={(checked) => onToggleDisabled(profile, !checked)}
                label={text.accountDisabled}
                disabled={isSelf}
              />
              <span>{profile.disabled ? text.accountDisabled : text.active}</span>
            </label>
            <Button type="button" variant="destructive" size="sm" onClick={onRemove} disabled={isSelf}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {text.removeAccess}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function mapAuthError(err: unknown, text: Record<string, string>): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code.includes("email-already-in-use")) return text.emailInUse;
  if (code.includes("weak-password")) return text.weakPassword;
  if (code.includes("invalid-email")) return text.invalidEmail;
  return err instanceof Error ? err.message : text.settingsSaveFailed;
}
