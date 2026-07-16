export const publicUser = (user) => {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  const { password, resetTokenHash, resetTokenExpiry, createdAt, updatedAt, ...safe } = plain;
  return safe;
};

export const serializeAuditLog = (log) => {
  const plain = log.toJSON ? log.toJSON() : log;
  return {
    id: `audit-${plain.id}`,
    actor: plain.actor,
    action: plain.action,
    metadata: plain.metadata,
    createdAt: plain.createdAt
  };
};
