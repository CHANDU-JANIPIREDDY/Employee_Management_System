export function withSession(session) {
  return session ? { session } : {};
}

function isTransactionUnsupported(error) {
  const message = String(error?.message || '');
  return error?.code === 20 || /replica set member|Transaction numbers are only allowed/i.test(message);
}

export async function withTransaction(work) {
  const { default: mongoose } = await import('mongoose');
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
