'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { selfServiceApi } from '@/lib/api/services';
import type { ApiProblem, ClientProfile } from '@/types/api';

type ProfileFormState = {
  phone: string;
  email: string;
  address: string;
  avatar: File | null;
};

function profileFormFromProfile(profile?: ClientProfile | null): ProfileFormState {
  return {
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
    address: profile?.address ?? '',
    avatar: null,
  };
}

function flattenErrorList(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  return null;
}

function getProblemMessage(error: unknown, fallback = 'Unable to update your profile.') {
  const problem = error as ApiProblem;
  if (problem?.message) return problem.message;

  if (problem?.errors && typeof problem.errors === 'object') {
    const first = Object.values(problem.errors).map(flattenErrorList).find(Boolean);
    if (first) return first;
  }

  return fallback;
}

export function SelfServiceProfileEditorCard({
  profile,
  onSaved,
  onCancel,
}: {
  profile?: ClientProfile | null;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProfileFormState>(() =>
    profileFormFromProfile(profile),
  );
  const [isSaving, setIsSaving] = useState(false);

  const avatarPreviewUrl = useMemo(() => {
    if (form.avatar) return URL.createObjectURL(form.avatar);
    return profile?.avatar_url ?? '';
  }, [form.avatar, profile?.avatar_url]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = new FormData();
      payload.append('phone', form.phone.trim());
      payload.append('email', form.email.trim());
      payload.append('address', form.address.trim());

      if (form.avatar) {
        payload.append('avatar', form.avatar);
      }

      await selfServiceApi.profile.update(payload);

      toast.success('Profile updated');
      await onSaved();
    } catch (error) {
      toast.error(getProblemMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div>
        <CardTitle>Edit profile</CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Update your profile photo and contact details.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-sm">
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-600">
              {getInitials(profile?.full_name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Field label="Profile picture">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setForm((current) => ({
                  ...current,
                  avatar: file,
                }));
              }}
            />
          </Field>

          <p className="mt-2 text-xs text-slate-500">
            Use a clear square image. JPG, PNG, or WebP is recommended.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            required
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </Field>
      </div>

      <Field label="Address">
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100"
          value={form.address}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              address: event.target.value,
            }))
          }
          placeholder="Enter your current address"
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}

        <Button
          type="button"
          className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          onClick={() => setForm(profileFormFromProfile(profile))}
        >
          Reset form
        </Button>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function getInitials(name?: string | null) {
  if (!name) return 'CP';

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return 'CP';

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}