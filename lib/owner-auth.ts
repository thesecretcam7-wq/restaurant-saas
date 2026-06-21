export const OWNER_EMAILS = [
  'thesecretcam7@gmail.com',
  'yepesalbert@hotmail.com',
]

export function isOwnerEmail(email?: string | null) {
  return Boolean(email && OWNER_EMAILS.includes(email))
}
