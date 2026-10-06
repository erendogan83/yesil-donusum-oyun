// Pages Functions handler type, declared locally to avoid a workers-types dependency.
type PagesFunction = (context: {
  request: Request;
  env: unknown;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;
