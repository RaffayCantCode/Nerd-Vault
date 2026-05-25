/** Tighter catalog limits on Netlify/AWS so browse API stays within function timeouts. */
export const isServerlessDeploy = Boolean(
  process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV,
);

export const MIXED_GENRE_MAX_API_PAGES = isServerlessDeploy ? 10 : 40;

export const MIXED_GENRE_MAX_DEPTH_ROUNDS = isServerlessDeploy ? 3 : 8;

export const BROWSE_GENRE_TOP_UP_MAX_PAGES = isServerlessDeploy ? 4 : 12;
