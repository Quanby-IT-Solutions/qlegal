-- Allow the app to read/insert/delete verification tokens (e.g. for email verification flow).
-- With RLS enabled and no policies, SELECT returns no rows; these policies fix that.
CREATE POLICY "verification_token_select" ON "verification_token" FOR SELECT USING (true);
CREATE POLICY "verification_token_insert" ON "verification_token" FOR INSERT WITH CHECK (true);
CREATE POLICY "verification_token_delete" ON "verification_token" FOR DELETE USING (true);
