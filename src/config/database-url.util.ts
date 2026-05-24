type Env = Record<string, string | undefined>;

const getValue = (env: Env, key: string, fallback: string): string => {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
};

export const buildPostgresUrl = (env: Env = process.env): string => {
  const url = env.DATABASE_URL?.trim();

  if (url) {
    return url;
  }

  const user = getValue(env, 'POSTGRES_USER', 'postgres');
  const password = getValue(env, 'POSTGRES_PASSWORD', 'postgres');
  const host = getValue(env, 'POSTGRES_HOST', 'localhost');
  const port = getValue(env, 'POSTGRES_PORT', '5432');
  const database = getValue(env, 'POSTGRES_DB', 'be_02');
  const schema = getValue(env, 'POSTGRES_SCHEMA', 'public');

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password,
  )}@${host}:${port}/${database}?schema=${schema}`;
};
