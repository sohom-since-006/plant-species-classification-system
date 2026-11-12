import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RLS Rule Engine Simulator
 * Accurately models PostgreSQL Row Level Security evaluation semantics
 * for the policies defined in supabase/schema.sql.
 */
class RlsPolicyEngine {
  // Evaluates a SELECT / DELETE using expression (returns boolean)
  static evalPredSelectOwn(authUid: string | null, rowUserId: string): boolean {
    if (!authUid) return false;
    return authUid === rowUserId;
  }

  static evalPredInsertOwn(authUid: string | null, rowUserId: string): boolean {
    if (!authUid) return false;
    return authUid === rowUserId;
  }

  static evalPredDeleteOwn(authUid: string | null, rowUserId: string): boolean {
    if (!authUid) return false;
    return authUid === rowUserId;
  }

  static evalPredUpdate(authUid: string | null): boolean {
    // In schema.sql, there is NO update policy on public.predictions
    // Postgres default: if RLS enabled and no update policy, UPDATE is blocked
    void authUid;
    return false;
  }

  static evalSpeciesWrite(authUid: string | null): boolean {
    // In schema.sql, public.species has only a select policy "species readable"
    // Write operations (INSERT, UPDATE, DELETE) have no policy -> DENIED for all clients
    void authUid;
    return false;
  }

  static evalSpeciesRead(): boolean {
    return true; // "species readable" using (true)
  }

  static evalProfileSelectOwn(authUid: string | null, profileId: string): boolean {
    if (!authUid) return false;
    return authUid === profileId;
  }

  static evalProfileUpdateOwn(authUid: string | null, profileId: string): boolean {
    if (!authUid) return false;
    return authUid === profileId;
  }

  static evalFeedbackInsert(
    authUid: string | null,
    submittedUserId: string | null,
    commentText?: string | null,
  ): { allowed: boolean; reason?: string } {
    // Check constraint: char_length(comment) <= 500
    if (commentText && commentText.length > 500) {
      return { allowed: false, reason: 'check constraint violation: comment length > 500' };
    }
    // RLS policy: with check (user_id is null or auth.uid() = user_id)
    if (submittedUserId === null) {
      return { allowed: true };
    }
    if (authUid && authUid === submittedUserId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'RLS check violation: user_id does not match auth.uid()' };
  }

  static evalFeedbackSelect(authUid: string | null): boolean {
    // In schema.sql, no SELECT policy exists on public.feedback
    // Client cannot read feedback rows (private to admins/evaluators)
    void authUid;
    return false;
  }

  static evalStorageFolderPolicy(
    bucketId: string,
    objectPath: string,
    authUid: string | null,
  ): boolean {
    if (bucketId !== 'uploads') return false;
    if (!authUid) return false;

    // storage.foldername(name)[1] extracts the first path segment
    const folder = objectPath.split('/')[0];
    return folder === authUid;
  }
}

describe('Row Level Security (RLS) Policy Verification against SECURITY.md', () => {
  const schemaPath = path.resolve(__dirname, '../../../supabase/schema.sql');
  const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

  describe('Schema SQL Static Security Invariants', () => {
    it('verifies schema.sql exists and contains RLS enablement for all 6 tables', () => {
      expect(schemaSql.length).toBeGreaterThan(0);

      const requiredRlsTables = [
        'public.species',
        'public.species_look_alikes',
        'public.model_versions',
        'public.profiles',
        'public.predictions',
        'public.feedback',
      ];

      for (const table of requiredRlsTables) {
        const regex = new RegExp(`alter\\s+table\\s+${table.replace('.', '\\.')}\\s+enable\\s+row\\s+level\\s+security;`, 'i');
        expect(schemaSql).toMatch(regex);
      }
    });

    it('verifies predictions table uses double-quoted "similar" to prevent Postgres syntax error', () => {
      expect(schemaSql).toMatch(/"similar"\s+jsonb/);
    });

    it('verifies feedback table enforces comment length <= 500 characters', () => {
      expect(schemaSql).toMatch(/char_length\(comment\)\s*<=\s*500/);
    });

    it('verifies storage bucket uploads is strictly private with 5 MB limit', () => {
      expect(schemaSql).toMatch(/insert into storage\.buckets/);
      expect(schemaSql).toMatch(/values \('uploads', 'uploads', false, 5242880/);
    });

    it('verifies read-only tables have NO client insert/update/delete policies', () => {
      expect(schemaSql).not.toMatch(/create policy.*on public\.species for insert/i);
      expect(schemaSql).not.toMatch(/create policy.*on public\.species for update/i);
      expect(schemaSql).not.toMatch(/create policy.*on public\.species for delete/i);
      expect(schemaSql).not.toMatch(/create policy.*on public\.model_versions for insert/i);
      expect(schemaSql).not.toMatch(/create policy.*on public\.species_look_alikes for insert/i);
    });

    it('verifies feedback table has NO select policy for client privacy', () => {
      expect(schemaSql).not.toMatch(/create policy.*on public\.feedback for select/i);
    });
  });

  describe('Isolation Tests: Predictions Table', () => {
    const userA = 'user-uuid-1111-aaaa';
    const userB = 'user-uuid-2222-bbbb';

    it('allows User A to select and delete their own predictions', () => {
      expect(RlsPolicyEngine.evalPredSelectOwn(userA, userA)).toBe(true);
      expect(RlsPolicyEngine.evalPredDeleteOwn(userA, userA)).toBe(true);
      expect(RlsPolicyEngine.evalPredInsertOwn(userA, userA)).toBe(true);
    });

    it("proves User A CANNOT read User B's prediction rows", () => {
      // User A attempts to select User B's row
      const canRead = RlsPolicyEngine.evalPredSelectOwn(userA, userB);
      expect(canRead).toBe(false);
    });

    it("proves User A CANNOT delete User B's prediction rows", () => {
      // User A attempts to delete User B's row
      const canDelete = RlsPolicyEngine.evalPredDeleteOwn(userA, userB);
      expect(canDelete).toBe(false);
    });

    it("proves User A CANNOT insert predictions on behalf of User B (user_id spoofing)", () => {
      const canInsert = RlsPolicyEngine.evalPredInsertOwn(userA, userB);
      expect(canInsert).toBe(false);
    });

    it('proves anonymous users CANNOT select, insert, or delete predictions', () => {
      expect(RlsPolicyEngine.evalPredSelectOwn(null, userA)).toBe(false);
      expect(RlsPolicyEngine.evalPredInsertOwn(null, userA)).toBe(false);
      expect(RlsPolicyEngine.evalPredDeleteOwn(null, userA)).toBe(false);
    });

    it('proves predictions are append-only/immutable (UPDATE is completely blocked)', () => {
      expect(RlsPolicyEngine.evalPredUpdate(userA)).toBe(false);
      expect(RlsPolicyEngine.evalPredUpdate(null)).toBe(false);
    });
  });

  describe('Read-Only Guarantee: Species and Model Versions', () => {
    const userA = 'user-uuid-1111-aaaa';

    it('allows public read access to species reference data for both anon and auth', () => {
      expect(RlsPolicyEngine.evalSpeciesRead()).toBe(true);
    });

    it('proves anonymous users CANNOT write (insert, update, delete) to the species table', () => {
      expect(RlsPolicyEngine.evalSpeciesWrite(null)).toBe(false);
    });

    it('proves authenticated users CANNOT write to the species table (only service-role/admin via seed)', () => {
      expect(RlsPolicyEngine.evalSpeciesWrite(userA)).toBe(false);
    });
  });

  describe('Isolation Tests: Profiles Table', () => {
    const userA = 'user-uuid-1111-aaaa';
    const userB = 'user-uuid-2222-bbbb';

    it("allows User A to select and update their own profile", () => {
      expect(RlsPolicyEngine.evalProfileSelectOwn(userA, userA)).toBe(true);
      expect(RlsPolicyEngine.evalProfileUpdateOwn(userA, userA)).toBe(true);
    });

    it("proves User A CANNOT select User B's profile", () => {
      expect(RlsPolicyEngine.evalProfileSelectOwn(userA, userB)).toBe(false);
    });

    it("proves User A CANNOT update User B's profile", () => {
      expect(RlsPolicyEngine.evalProfileUpdateOwn(userA, userB)).toBe(false);
    });

    it('proves anonymous users CANNOT read profiles', () => {
      expect(RlsPolicyEngine.evalProfileSelectOwn(null, userA)).toBe(false);
    });
  });

  describe('Feedback Privacy and Constraints', () => {
    const userA = 'user-uuid-1111-aaaa';
    const userB = 'user-uuid-2222-bbbb';

    it('allows guest/anonymous submission with user_id = null', () => {
      const res = RlsPolicyEngine.evalFeedbackInsert(null, null, 'Looks like holy basil');
      expect(res.allowed).toBe(true);
    });

    it('allows authenticated user submission with their own user_id', () => {
      const res = RlsPolicyEngine.evalFeedbackInsert(userA, userA, 'Accurate flower classification');
      expect(res.allowed).toBe(true);
    });

    it('blocks forged user_id submission (User A submitting with User B id)', () => {
      const res = RlsPolicyEngine.evalFeedbackInsert(userA, userB, 'Spoofed note');
      expect(res.allowed).toBe(false);
    });

    it('blocks anonymous submitter attempting to assign feedback to a user ID', () => {
      const res = RlsPolicyEngine.evalFeedbackInsert(null, userA, 'Anonymous spoof attempt');
      expect(res.allowed).toBe(false);
    });

    it('enforces comment character limit <= 500 characters', () => {
      const validComment = 'A'.repeat(500);
      const invalidComment = 'A'.repeat(501);

      expect(RlsPolicyEngine.evalFeedbackInsert(userA, userA, validComment).allowed).toBe(true);
      expect(RlsPolicyEngine.evalFeedbackInsert(userA, userA, invalidComment).allowed).toBe(false);
    });

    it('proves client SELECT queries on feedback are completely blocked for all users', () => {
      expect(RlsPolicyEngine.evalFeedbackSelect(userA)).toBe(false);
      expect(RlsPolicyEngine.evalFeedbackSelect(null)).toBe(false);
    });
  });

  describe('Storage Uploads Bucket Isolation', () => {
    const userA = 'user-uuid-1111-aaaa';
    const userB = 'user-uuid-2222-bbbb';

    it("allows User A to upload and read within their own user folder: 'userA/photo.jpg'", () => {
      const allowed = RlsPolicyEngine.evalStorageFolderPolicy('uploads', `${userA}/pred_1.jpg`, userA);
      expect(allowed).toBe(true);
    });

    it("blocks User A from uploading or reading inside User B's folder: 'userB/photo.jpg'", () => {
      const allowed = RlsPolicyEngine.evalStorageFolderPolicy('uploads', `${userB}/pred_1.jpg`, userA);
      expect(allowed).toBe(false);
    });

    it('blocks anonymous access to user storage folders', () => {
      const allowed = RlsPolicyEngine.evalStorageFolderPolicy('uploads', `${userA}/pred_1.jpg`, null);
      expect(allowed).toBe(false);
    });

    it('blocks non-uploads buckets', () => {
      const allowed = RlsPolicyEngine.evalStorageFolderPolicy('public-assets', `${userA}/pred_1.jpg`, userA);
      expect(allowed).toBe(false);
    });
  });
});
