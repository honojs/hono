export const createEmptyRecord = () => Object.create(null)
export const createResponse = (body?: BodyInit | null, init?: ResponseInit) =>
  new Response(body, init)
