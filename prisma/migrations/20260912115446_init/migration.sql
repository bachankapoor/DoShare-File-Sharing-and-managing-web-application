-- DropForeignKey
ALTER TABLE "access_events" DROP CONSTRAINT "access_events_documentId_fkey";

-- DropForeignKey
ALTER TABLE "access_events" DROP CONSTRAINT "access_events_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "access_policies" DROP CONSTRAINT "access_policies_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "access_session_documents" DROP CONSTRAINT "access_session_documents_documentId_fkey";

-- DropForeignKey
ALTER TABLE "access_session_documents" DROP CONSTRAINT "access_session_documents_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "access_sessions" DROP CONSTRAINT "access_sessions_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "document_versions" DROP CONSTRAINT "document_versions_documentId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "print_jobs" DROP CONSTRAINT "print_jobs_sessionId_fkey";

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_sessions" ADD CONSTRAINT "access_sessions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_session_documents" ADD CONSTRAINT "access_session_documents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "access_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_session_documents" ADD CONSTRAINT "access_session_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "access_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "access_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "access_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
