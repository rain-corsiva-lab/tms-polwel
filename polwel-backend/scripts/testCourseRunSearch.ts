import 'dotenv/config';

interface CliOptions {
  baseUrl: string;
  email: string;
  password: string;
  search: string;
  status: string | undefined;
  limit: number;
  page: number;
}

const argValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
};

const parseNumberArg = (flag: string, fallback: number): number => {
  const raw = argValue(flag) ?? process.env[flag.replace(/^--/, '').toUpperCase()] ?? fallback.toString();
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveFetch = async (): Promise<typeof fetch> => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis) as typeof fetch;
  }

  throw new Error('Global fetch API is unavailable. Please run on Node 18+ or install a fetch polyfill.');
};

function resolveOptions(): CliOptions {
  const baseUrl = argValue('--base-url') ?? process.env.API_BASE_URL ?? 'http://localhost:3001';
  const email = argValue('--email') ?? process.env.TEST_EMAIL ?? 'john.tan@polwel.org';
  const password = argValue('--password') ?? process.env.TEST_PASSWORD ?? 'password123';
  const search = argValue('--query') ?? process.env.TEST_SEARCH ?? '';
  const status = argValue('--status') ?? process.env.TEST_STATUS;
  const limit = parseNumberArg('--limit', 5);
  const page = parseNumberArg('--page', 1);

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    email,
    password,
    search,
    status,
    limit,
    page,
  };
}

async function run(): Promise<void> {
  const options = resolveOptions();
  const fetchFn = await resolveFetch();

  console.log('🔐 Authenticating to retrieve access token...');
  const loginResponse = await fetchFn(`${options.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: options.email,
      password: options.password,
      rememberMe: true,
    }),
  });

  const loginBody = await loginResponse.text();
  if (!loginResponse.ok) {
    throw new Error(`Login failed (${loginResponse.status} ${loginResponse.statusText}): ${loginBody}`);
  }

  let loginJson: any;
  try {
    loginJson = JSON.parse(loginBody);
  } catch (error) {
    throw new Error(`Failed to parse login response: ${(error as Error).message}\n${loginBody}`);
  }

  const accessToken = loginJson?.accessToken;
  if (!accessToken) {
    throw new Error('Login response did not contain an accessToken.');
  }

  const currentUser = loginJson?.user?.email ?? options.email;
  console.log(`✅ Logged in as ${currentUser}`);

  const searchUrl = new URL('/api/course-runs', options.baseUrl);
  searchUrl.searchParams.set('page', String(options.page));
  searchUrl.searchParams.set('limit', String(options.limit));
  if (options.search) {
    searchUrl.searchParams.set('search', options.search);
  }
  if (options.status) {
    searchUrl.searchParams.set('status', options.status);
  }

  console.log(`🔎 Fetching course runs from ${searchUrl.toString()} ...`);
  const searchResponse = await fetchFn(searchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const responseBody = await searchResponse.text();
  if (!searchResponse.ok) {
    throw new Error(`Course run search failed (${searchResponse.status} ${searchResponse.statusText}): ${responseBody}`);
  }

  let json: any;
  try {
    json = JSON.parse(responseBody);
  } catch (error) {
    throw new Error(`Failed to parse search response: ${(error as Error).message}\n${responseBody}`);
  }

  if (!json?.success) {
    throw new Error(`Unexpected response payload: ${responseBody}`);
  }

  const courseRuns: any[] = Array.isArray(json.courseRuns) ? json.courseRuns : [];
  const pagination = json.pagination ?? {};

  console.log(`📦 Received ${courseRuns.length} course runs (page ${pagination.page ?? options.page} of ${pagination.totalPages ?? 'unknown'})`);

  if (courseRuns.length === 0) {
    console.log('ℹ️ No course runs matched the query.');
    return;
  }

  const preview = courseRuns.slice(0, options.limit).map(run => ({
    id: run.id,
    serialNumber: run.serialNumber ?? '—',
    courseCode: run.course?.courseCode ?? '—',
    title: run.course?.title ?? 'Untitled',
    status: run.status ?? '—',
    start: run.startDatetime ?? '—',
    end: run.endDatetime ?? '—',
  }));

  console.table(preview);
}

run().catch(error => {
  console.error('❌ Authenticated course run search failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
