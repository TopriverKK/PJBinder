import { sbDelete, sbUpsert } from '../src/supabase/rest.js';

function nowIso() {
	return new Date().toISOString();
}

function ymd(d: Date) {
	return d.toISOString().slice(0, 10);
}

function errorMessage(e: unknown): string {
	if (e instanceof Error) return e.message;
	return typeof e === 'string' ? e : JSON.stringify(e);
}

export default async function handler(req: any, res: any) {
	if (req.method !== 'GET') {
		res.statusCode = 405;
		res.setHeader('content-type', 'application/json; charset=utf-8');
		res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
		return;
	}

	// Attempts a round-trip insert + delete on attendance_worklogs.
	// This helps diagnose missing env vars / RLS / schema mismatch.
	const tag = `diag_${crypto.randomUUID().slice(0, 8)}`;
	const start = nowIso();
	const row = {
		user_id: 'DIAG',
		work_date: ymd(new Date()),
		start_at: start,
		end_at: start,
		project_id: null,
		task_id: null,
		source: tag,
	};

	try {
		const inserted = await sbUpsert('attendance_worklogs', row as any);
		const id = (inserted as any)?.id;
		if (id == null) {
			res.statusCode = 500;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end(JSON.stringify({ ok: false, error: 'Insert succeeded but no id returned', inserted }));
			return;
		}
		try {
			await sbDelete('attendance_worklogs', String(id));
		} catch (e) {
			// Deleting may fail if RLS blocks deletes; still return insert info.
			res.statusCode = 200;
			res.setHeader('content-type', 'application/json; charset=utf-8');
			res.end(JSON.stringify({ ok: true, insertedId: id, deleted: false, deleteError: errorMessage(e) }));
			return;
		}

		res.statusCode = 200;
		res.setHeader('content-type', 'application/json; charset=utf-8');
		res.end(JSON.stringify({ ok: true, insertedId: id, deleted: true }));
	} catch (e) {
		res.statusCode = 500;
		res.setHeader('content-type', 'application/json; charset=utf-8');
		res.end(JSON.stringify({ ok: false, error: errorMessage(e) }));
	}
}

