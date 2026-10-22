// One-off verification for 20261017000000_add_multi_branch_support.
// Reads CONN from env (a Neon branch copy). Never touches production.
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.CONN,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const one = async (sql, params = []) => {
  const r = await client.query(sql, params);
  return r.rows;
};

const phase = process.argv[2] ?? 'all';

const tableExists = async (name) =>
  (await one(`SELECT to_regclass($1) IS NOT NULL AS e`, [name]))[0].e;

const coreCounts = async (label) => {
  // Tolerate pre-migration state: new tables may not exist yet.
  const hasBranches = await tableExists('branches');
  const hasRoutes = await tableExists('category_routes');
  const rows = await one(`
    SELECT 'organizations' AS t, count(*)::text AS n FROM organizations
    UNION ALL SELECT 'users', count(*)::text FROM users
    UNION ALL SELECT 'units', count(*)::text FROM units
    UNION ALL SELECT 'complaints', count(*)::text FROM complaints
  `);
  if (hasBranches) {
    rows.push(...(await one(`SELECT 'branches' AS t, count(*)::text AS n FROM branches`)));
  } else {
    rows.push({ t: 'branches', n: 'n/a (table missing)' });
  }
  if (hasRoutes) {
    rows.push(...(await one(`SELECT 'category_routes' AS t, count(*)::text AS n FROM category_routes`)));
  } else {
    rows.push({ t: 'category_routes', n: 'n/a (table missing)' });
  }
  console.log(`[${label}] core counts:`, Object.fromEntries(rows.map((r) => [r.t, r.n])));
  return Object.fromEntries(rows.map((r) => [r.t, Number(r.n)]));
};

const correctness = async () => {
  const checks = {};
  checks.orgsMissingMainBranch = (await one(`
    SELECT o.id, o.name FROM organizations o
    LEFT JOIN branches b ON b.org_id = o.id AND b.name = 'Main'
    GROUP BY o.id, o.name HAVING count(b.id) <> 1
  `)).length;
  checks.mainBranchJoinCodeMismatch = Number((await one(`
    SELECT count(*) AS n FROM branches b
    JOIN organizations o ON o.id = b.org_id
    WHERE b.name = 'Main' AND b.join_code <> o.join_code
  `))[0].n);
  checks.unitsWithoutBranch = Number((await one(`SELECT count(*) AS n FROM units WHERE branch_id IS NULL`))[0].n);
  checks.complaintsWithoutBranch = Number((await one(`SELECT count(*) AS n FROM complaints WHERE branch_id IS NULL`))[0].n);
  checks.usersWithoutBranchByRole = await one(`
    SELECT role, count(*) AS n FROM users WHERE branch_id IS NULL GROUP BY role ORDER BY role
  `);
  checks.categoriesWithDefaultUnit = Number((await one(`SELECT count(*) AS n FROM categories WHERE default_unit_id IS NOT NULL`))[0].n);
  checks.routes = Number((await one(`SELECT count(*) AS n FROM category_routes`))[0].n);
  checks.escalationLevels = await one(`
    SELECT escalation_level, count(*) AS n FROM complaints GROUP BY escalation_level ORDER BY escalation_level
  `);
  checks.branchJoinCodesUnique = Number((await one(`
    SELECT count(*) - count(DISTINCT join_code) AS n FROM branches
  `))[0].n);
  console.log('[correctness]', JSON.stringify(checks, null, 2));
  return checks;
};

const fingerprint = async () => {
  const rows = await one(`
    SELECT md5(string_agg(id || ':' || coalesce(branch_id, 'NULL'), ',' ORDER BY id)) AS users_fp FROM users
  `);
  const units = await one(`
    SELECT md5(string_agg(id || ':' || coalesce(branch_id, 'NULL'), ',' ORDER BY id)) AS units_fp FROM units
  `);
  const complaints = await one(`
    SELECT md5(string_agg(id || ':' || coalesce(branch_id, 'NULL'), ',' ORDER BY id)) AS complaints_fp FROM complaints
  `);
  const routes = await one(`
    SELECT md5(string_agg(id || ':' || category_id || ':' || branch_id || ':' || unit_id, ',' ORDER BY id)) AS routes_fp FROM category_routes
  `);
  return { ...rows[0], ...units[0], ...complaints[0], ...routes[0] };
};

if (phase === 'before') {
  await coreCounts('BEFORE');
} else if (phase === 'after') {
  await coreCounts('AFTER');
  await correctness();
  console.log('[fingerprint-after]', JSON.stringify(await fingerprint()));
} else if (phase === 'idempotency') {
  // Re-run ONLY the backfill statements from the migration (DDL is not
  // idempotent by design — Prisma tracks applied migrations).
  await client.query('BEGIN');
  await client.query(`
    INSERT INTO "branches" ("id", "org_id", "name", "join_code")
    SELECT gen_random_uuid()::TEXT, o."id", 'Main', o."join_code"
    FROM "organizations" o
    WHERE NOT EXISTS (
        SELECT 1 FROM "branches" b
        WHERE b."org_id" = o."id" AND b."name" = 'Main'
    )
    ON CONFLICT ("join_code") DO NOTHING
  `);
  await client.query(`
    UPDATE "units" u SET "branch_id" = b."id" FROM "branches" b
    WHERE b."org_id" = u."org_id" AND b."name" = 'Main' AND u."branch_id" IS NULL
  `);
  await client.query(`
    UPDATE "complaints" c SET "branch_id" = b."id" FROM "branches" b
    WHERE b."org_id" = c."org_id" AND b."name" = 'Main' AND c."branch_id" IS NULL
  `);
  await client.query(`
    UPDATE "users" us SET "branch_id" = b."id" FROM "branches" b
    WHERE b."org_id" = us."org_id" AND b."name" = 'Main'
      AND us."role" NOT IN ('ORG_ADMIN', 'SUPER_ADMIN')
      AND us."branch_id" IS NULL
  `);
  await client.query(`
    INSERT INTO "category_routes" ("id", "category_id", "branch_id", "unit_id")
    SELECT gen_random_uuid()::TEXT, c."id", b."id", c."default_unit_id"
    FROM "categories" c
    JOIN "branches" b ON b."org_id" = c."org_id" AND b."name" = 'Main'
    WHERE c."default_unit_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "category_routes" r
        WHERE r."category_id" = c."id" AND r."branch_id" = b."id"
      )
    ON CONFLICT ("category_id", "branch_id") DO NOTHING
  `);
  await client.query('COMMIT');
  console.log('[idempotency] backfills re-run');
  await coreCounts('AFTER-RERUN');
  console.log('[fingerprint-rerun]', JSON.stringify(await fingerprint()));
}

await client.end();
