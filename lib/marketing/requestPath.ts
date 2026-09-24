// Request header that proxy.ts sets to the requested pathname, for the marketing
// root layout to read. A root layout wraps every page of its route group and is
// never told which one is rendering, so without this it could only send a
// visitor with an expired session back to "/" after logging in.
export const REQUEST_PATH_HEADER = 'x-caativar-path'
