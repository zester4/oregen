import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, index, uniqueIndex } from ‘drizzle-orm/pg-core’;
import { relations } from ‘drizzle-orm’;

// ============================================================
// LEADS TABLE
// ============================================================
export const leads = pgTable(‘leads’, {
id: serial(‘id’).primaryKey(),

// Personal Information
firstName: varchar(‘first_name’, { length: 100 }),
lastName: varchar(‘last_name’, { length: 100 }),
fullName: varchar(‘full_name’, { length: 200 }).notNull(),

// Professional Information
position: varchar(‘position’, { length: 200 }),
company: varchar(‘company’, { length: 200 }),
companyDomain: varchar(‘company_domain’, { length: 200 }),
industry: varchar(‘industry’, { length: 100 }),
companySize: varchar(‘company_size’, { length: 50 }),

// Contact Information (from scraping)
scrapedEmail: varchar(‘scraped_email’, { length: 255 }),
phoneNumber: varchar(‘phone_number’, { length: 50 }),
location: varchar(‘location’, { length: 200 }),
city: varchar(‘city’, { length: 100 }),
state: varchar(‘state’, { length: 100 }),
country: varchar(‘country’, { length: 100 }),

// Social Profiles
linkedinUrl: text(‘linkedin_url’),
twitterUrl: text(‘twitter_url’),
githubUrl: text(‘github_url’),
personalWebsite: text(‘personal_website’),

// Source Information
sourcePlatform: varchar(‘source_platform’, { length: 50 }).notNull(),
sourceUrl: text(‘source_url’),
scrapedAt: timestamp(‘scraped_at’).defaultNow().notNull(),

// Data Quality
dataQualityScore: integer(‘data_quality_score’).default(0),
isVerified: boolean(‘is_verified’).default(false),

// Additional Data
bio: text(‘bio’),
skills: jsonb(‘skills’).$type<string[]>(),
metadata: jsonb(‘metadata’).$type<Record<string, any>>(),

// Timestamps
createdAt: timestamp(‘created_at’).defaultNow().notNull(),
updatedAt: timestamp(‘updated_at’).defaultNow().notNull(),
}, (table) => ({
emailIdx: index(‘lead_email_idx’).on(table.scrapedEmail),
companyIdx: index(‘lead_company_idx’).on(table.company),
domainIdx: index(‘lead_domain_idx’).on(table.companyDomain),
uniqueLeadIdx: uniqueIndex(‘unique_lead_idx’).on(table.fullName, table.company),
}));

// ============================================================
// EMAIL PATTERNS TABLE
// ============================================================
export const emailPatterns = pgTable(‘email_patterns’, {
id: serial(‘id’).primaryKey(),

domain: varchar(‘domain’, { length: 200 }).notNull(),
pattern: varchar(‘pattern’, { length: 100 }).notNull(),

// Pattern Examples: {first}.{last}, {f}{last}, {first}, {first}{l}
patternType: varchar(‘pattern_type’, { length: 50 }).notNull(),

// Confidence Metrics
confidenceScore: integer(‘confidence_score’).default(0),
verifiedCount: integer(‘verified_count’).default(0),
failedCount: integer(‘failed_count’).default(0),

// Pattern Source
discoveredFrom: varchar(‘discovered_from’, { length: 50 }),
lastVerifiedAt: timestamp(‘last_verified_at’),

// Status
isActive: boolean(‘is_active’).default(true),
isCatchAll: boolean(‘is_catch_all’).default(false),

createdAt: timestamp(‘created_at’).defaultNow().notNull(),
updatedAt: timestamp(‘updated_at’).defaultNow().notNull(),
}, (table) => ({
domainIdx: index(‘pattern_domain_idx’).on(table.domain),
uniquePatternIdx: uniqueIndex(‘unique_pattern_idx’).on(table.domain, table.pattern),
}));

// ============================================================
// ENRICHED EMAILS TABLE
// ============================================================
export const enrichedEmails = pgTable(‘enriched_emails’, {
id: serial(‘id’).primaryKey(),
leadId: integer(‘lead_id’).notNull().references(() => leads.id, { onDelete: ‘cascade’ }),

email: varchar(‘email’, { length: 255 }).notNull(),
emailPattern: varchar(‘email_pattern’, { length: 100 }),

// Verification Status
verificationStatus: varchar(‘verification_status’, { length: 50 }).notNull(),
// Status values: ‘verified’, ‘unverified’, ‘invalid’, ‘risky’, ‘catch-all’

confidenceLevel: varchar(‘confidence_level’, { length: 20 }).notNull(),
// Levels: ‘high’, ‘medium’, ‘low’

confidenceScore: integer(‘confidence_score’).default(0),

// SMTP Verification Details
smtpVerified: boolean(‘smtp_verified’).default(false),
mxRecordValid: boolean(‘mx_record_valid’).default(false),
catchAllDetected: boolean(‘catch_all_detected’).default(false),

// Enrichment Metadata
verificationMethod: varchar(‘verification_method’, { length: 50 }),
verifiedAt: timestamp(‘verified_at’),
verificationDetails: jsonb(‘verification_details’).$type<Record<string, any>>(),

createdAt: timestamp(‘created_at’).defaultNow().notNull(),
updatedAt: timestamp(‘updated_at’).defaultNow().notNull(),
}, (table) => ({
leadIdIdx: index(‘enriched_email_lead_idx’).on(table.leadId),
emailIdx: index(‘enriched_email_idx’).on(table.email),
statusIdx: index(‘enriched_status_idx’).on(table.verificationStatus),
uniqueLeadEmailIdx: uniqueIndex(‘unique_lead_email_idx’).on(table.leadId, table.email),
}));

// ============================================================
// VERIFIED EMAILS TABLE (for pattern learning)
// ============================================================
export const verifiedEmails = pgTable(‘verified_emails’, {
id: serial(‘id’).primaryKey(),

email: varchar(‘email’, { length: 255 }).notNull().unique(),
domain: varchar(‘domain’, { length: 200 }).notNull(),
pattern: varchar(‘pattern’, { length: 100 }),

firstName: varchar(‘first_name’, { length: 100 }),
lastName: varchar(‘last_name’, { length: 100 }),

source: varchar(‘source’, { length: 100 }).notNull(),
// Source: ‘scraping’, ‘manual’, ‘api’, ‘verification’

verifiedAt: timestamp(‘verified_at’).defaultNow().notNull(),
lastCheckedAt: timestamp(‘last_checked_at’),

isActive: boolean(‘is_active’).default(true),

createdAt: timestamp(‘created_at’).defaultNow().notNull(),
}, (table) => ({
emailIdx: index(‘verified_email_idx’).on(table.email),
domainIdx: index(‘verified_domain_idx’).on(table.domain),
}));

// ============================================================
// SCRAPING JOBS TABLE
// ============================================================
export const scrapingJobs = pgTable(‘scraping_jobs’, {
id: serial(‘id’).primaryKey(),

jobName: varchar(‘job_name’, { length: 200 }).notNull(),
platform: varchar(‘platform’, { length: 50 }).notNull(),
searchQuery: text(‘search_query’),

status: varchar(‘status’, { length: 50 }).notNull().default(‘pending’),
// Status: ‘pending’, ‘running’, ‘completed’, ‘failed’, ‘paused’

// Job Configuration
targetCount: integer(‘target_count’),
config: jsonb(‘config’).$type<Record<string, any>>(),

// Progress Tracking
totalLeadsFound: integer(‘total_leads_found’).default(0),
leadsProcessed: integer(‘leads_processed’).default(0),
leadsSaved: integer(‘leads_saved’).default(0),
errors: jsonb(‘errors’).$type<string[]>().default([]),

// Timing
startedAt: timestamp(‘started_at’),
completedAt: timestamp(‘completed_at’),
duration: integer(‘duration’), // in seconds

createdAt: timestamp(‘created_at’).defaultNow().notNull(),
updatedAt: timestamp(‘updated_at’).defaultNow().notNull(),
}, (table) => ({
statusIdx: index(‘job_status_idx’).on(table.status),
platformIdx: index(‘job_platform_idx’).on(table.platform),
}));

// ============================================================
// ENRICHMENT JOBS TABLE
// ============================================================
export const enrichmentJobs = pgTable(‘enrichment_jobs’, {
id: serial(‘id’).primaryKey(),

jobName: varchar(‘job_name’, { length: 200 }).notNull(),
status: varchar(‘status’, { length: 50 }).notNull().default(‘pending’),

// Job Configuration
leadIds: jsonb(‘lead_ids’).$type<number[]>(),
enrichmentType: varchar(‘enrichment_type’, { length: 50 }).notNull(),
// Types: ‘email’, ‘phone’, ‘social’, ‘full’

// Progress Tracking
totalLeads: integer(‘total_leads’).default(0),
leadsEnriched: integer(‘leads_enriched’).default(0),
emailsGenerated: integer(‘emails_generated’).default(0),
emailsVerified: integer(‘emails_verified’).default(0),

// Results
successRate: integer(‘success_rate’).default(0),
results: jsonb(‘results’).$type<Record<string, any>>(),

startedAt: timestamp(‘started_at’),
completedAt: timestamp(‘completed_at’),

createdAt: timestamp(‘created_at’).defaultNow().notNull(),
updatedAt: timestamp(‘updated_at’).defaultNow().notNull(),
}, (table) => ({
statusIdx: index(‘enrichment_status_idx’).on(table.status),
}));

// ============================================================
// RELATIONS
// ============================================================
export const leadsRelations = relations(leads, ({ many }) => ({
enrichedEmails: many(enrichedEmails),
}));

export const enrichedEmailsRelations = relations(enrichedEmails, ({ one }) => ({
lead: one(leads, {
fields: [enrichedEmails.leadId],
references: [leads.id],
}),
}));

// ============================================================
// TYPE EXPORTS
// ============================================================
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type EmailPattern = typeof emailPatterns.$inferSelect;
export type NewEmailPattern = typeof emailPatterns.$inferInsert;

export type EnrichedEmail = typeof enrichedEmails.$inferSelect;
export type NewEnrichedEmail = typeof enrichedEmails.$inferInsert;

export type VerifiedEmail = typeof verifiedEmails.$inferSelect;
export type NewVerifiedEmail = typeof verifiedEmails.$inferInsert;

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type NewScrapingJob = typeof scrapingJobs.$inferInsert;

export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;
export type NewEnrichmentJob = typeof enrichmentJobs.$inferInsert;