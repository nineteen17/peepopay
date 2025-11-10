#!/usr/bin/env tsx
/**
 * Type Validation Script
 *
 * Validates that types are in sync across Dashboard and Widget
 * Used in pre-commit hooks to prevent out-of-sync types
 *
 * Usage: npm run validate-types
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

const ROOT_DIR = resolve(__dirname, '..');
const DASHBOARD_TYPES = resolve(ROOT_DIR, 'packages/dashboard/src/types/api.ts');
const WIDGET_TYPES = resolve(ROOT_DIR, 'packages/widget/src/types/api.ts');
const CHECKSUM_FILE = resolve(ROOT_DIR, '.generated/checksum.json');

console.log('🔍 Validating API types across packages...\n');

// Check if files exist
if (!existsSync(DASHBOARD_TYPES)) {
  console.error('❌ Dashboard types not found:', DASHBOARD_TYPES);
  console.error('   Run: npm run sync-types');
  process.exit(1);
}

if (!existsSync(WIDGET_TYPES)) {
  console.error('❌ Widget types not found:', WIDGET_TYPES);
  console.error('   Run: npm run sync-types');
  process.exit(1);
}

// Read files
const dashboardContent = readFileSync(DASHBOARD_TYPES, 'utf-8');
const widgetContent = readFileSync(WIDGET_TYPES, 'utf-8');

// Strip headers (first 15 lines) for comparison
const stripHeader = (content: string) => content.split('\n').slice(15).join('\n');

const dashboardHash = createHash('md5')
  .update(stripHeader(dashboardContent))
  .digest('hex');

const widgetHash = createHash('md5')
  .update(stripHeader(widgetContent))
  .digest('hex');

console.log(`📊 Dashboard checksum: ${dashboardHash.substring(0, 12)}...`);
console.log(`📊 Widget checksum:    ${widgetHash.substring(0, 12)}...`);

// Compare checksums
if (dashboardHash !== widgetHash) {
  console.error('\n❌ Types are out of sync!');
  console.error('   Dashboard and Widget have different API types.');
  console.error('\n   Run: npm run sync-types\n');
  process.exit(1);
}

// Check against stored checksum
if (existsSync(CHECKSUM_FILE)) {
  const checksumData = JSON.parse(readFileSync(CHECKSUM_FILE, 'utf-8'));
  console.log(`📊 Stored checksum:    ${checksumData.checksum.substring(0, 12)}...`);
  console.log(`📅 Last synced:        ${new Date(checksumData.timestamp).toLocaleString()}`);
}

console.log('\n✅ All types are in sync!');
console.log('   Dashboard and Widget are using the same API types.\n');
