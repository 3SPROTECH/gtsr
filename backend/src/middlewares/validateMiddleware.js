// Wraps a Zod schema as Express middleware (body / query / params)

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (e) {
      next(e);
    }
  };
}
