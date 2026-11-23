import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { members, users } from './schema.ts';
import {
  syncMemberToSupabase,
  syncUserToSupabase,
} from './supabaseSync.ts';
import { type StaffRole, type UserRole } from '../types/app.ts';

const SUPER_ADMIN_EMAIL = 'cimentq@gmail.com';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName = ''
): Promise<{ uid: string; email: string; displayName: string; role: UserRole }> {
  const cleanEmail = email.trim().toLowerCase();
  let resolvedRole: UserRole = 'client';

  try {
    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      resolvedRole = 'super_admin';
    } else {
      const byUid = await db
        .select()
        .from(members)
        .where(eq(members.uid, uid))
        .limit(1);

      if (byUid.length > 0) {
        resolvedRole = byUid[0].active
          ? (byUid[0].role as UserRole)
          : 'client';
      } else if (cleanEmail) {
        const byEmail = await db
          .select()
          .from(members)
          .where(eq(members.email, cleanEmail))
          .limit(1);

        if (byEmail.length > 0 && byEmail[0].active) {
          resolvedRole = byEmail[0].role as UserRole;
          const nextViewers = Array.from(
            new Set([uid, ...(byEmail[0].staffViewerUids || [])])
          ).slice(0, 30);
          const [updatedMember] = await db
            .update(members)
            .set({
              uid,
              staffViewerUids: nextViewers,
              updatedAt: new Date(),
            })
            .where(eq(members.id, byEmail[0].id))
            .returning();

          if (updatedMember) {
            void syncMemberToSupabase({
              id: updatedMember.id,
              uid: updatedMember.uid ?? undefined,
              fullName: updatedMember.fullName,
              email: updatedMember.email,
              phone: updatedMember.phone,
              role: updatedMember.role as StaffRole,
              active: updatedMember.active,
              assignedByUid: updatedMember.assignedByUid,
              staffViewerUids: updatedMember.staffViewerUids || [],
              createdAt: updatedMember.createdAt.toISOString(),
              updatedAt: updatedMember.updatedAt.toISOString(),
            });
          }
        }
      }
    }

    const fallbackName =
      displayName.trim() ||
      (cleanEmail ? cleanEmail.split('@')[0] : 'Utilisateur GIS');

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        displayName: fallbackName,
        role: resolvedRole,
        active: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          displayName: fallbackName,
          role: resolvedRole,
          updatedAt: new Date(),
        },
      })
      .returning();

    const synced = {
      uid: result[0].uid,
      email: result[0].email,
      displayName: result[0].displayName,
      role: result[0].role as UserRole,
    };

    void syncUserToSupabase(synced);
    return synced;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database user sync failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  }
}
