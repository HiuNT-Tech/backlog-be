export const normalizeString = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};
