'use strict';

const STATUS = {
  PENDING_PROVIDER: 'pending_provider_acceptance',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  REJECTED: 'rejected',
};

function normalizeBookingStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return STATUS.PENDING_PROVIDER;
  if (['pending', 'pending_provider_acceptance', 'request_sent', 'awaiting_provider'].includes(value)) return STATUS.PENDING_PROVIDER;
  if (['accepted', 'confirm', 'confirmed'].includes(value)) return STATUS.CONFIRMED;
  if (['operating', 'active'].includes(value)) return STATUS.ACTIVE;
  if (['in_progress', 'in-progress', 'started'].includes(value)) return STATUS.IN_PROGRESS;
  if (['completed', 'complete', 'done'].includes(value)) return STATUS.COMPLETED;
  if (['cancelled', 'canceled', 'cancel'].includes(value)) return STATUS.CANCELED;
  if (['rejected', 'reject', 'declined', 'denied'].includes(value)) return STATUS.REJECTED;
  return value;
}

function isPendingProviderStatus(status) {
  return normalizeBookingStatus(status) === STATUS.PENDING_PROVIDER;
}

function isActiveProviderStatus(status) {
  return [STATUS.CONFIRMED, STATUS.ACTIVE, STATUS.IN_PROGRESS].includes(normalizeBookingStatus(status));
}

module.exports = {
  STATUS,
  normalizeBookingStatus,
  isPendingProviderStatus,
  isActiveProviderStatus,
};
