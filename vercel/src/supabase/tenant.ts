import { AsyncLocalStorage } from 'node:async_hooks';

type TenantContext = { tenantId: string };

const TENANTLESS_TABLES = new Set(['tenants']);
const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  const id = String(tenantId || '').trim();
  if (!id) throw new Error('tenant_id is required');
  return storage.run({ tenantId: id }, fn);
}

export function getTenantId(): string {
  return String(storage.getStore()?.tenantId || '').trim();
}

export function isTenantScoped(table: string): boolean {
  return !TENANTLESS_TABLES.has(String(table || '').trim());
}

export function requireTenantId(table: string): string {
  if (!isTenantScoped(table)) return '';
  const id = getTenantId();
  if (!id) throw new Error('tenant_id is not set for this request');
  return id;
}
