type ReconciliableDineInOrder = {
  id: string;
  order_number?: string | null;
};

export function reconcileSavedDineInOrder<T extends ReconciliableDineInOrder>(
  orders: T[],
  optimisticOrderIds: Array<string | null | undefined>,
  savedOrderId: string,
  savedOrderNumber?: string | null,
): T[] {
  const optimisticIds = new Set(optimisticOrderIds.filter((id): id is string => Boolean(id)));
  const savedOrder = orders.find((order) => order.id === savedOrderId);
  const optimisticOrder = orders.find((order) => optimisticIds.has(order.id));
  const replacement = savedOrder || (optimisticOrder
    ? {
        ...optimisticOrder,
        id: savedOrderId,
        order_number: savedOrderNumber || optimisticOrder.order_number,
      }
    : null);

  if (!replacement) return orders;

  const replacedIds = new Set([...optimisticIds, savedOrderId]);
  const insertionIndex = orders.findIndex((order) => replacedIds.has(order.id));
  const reconciled = orders.filter((order) => !replacedIds.has(order.id));
  reconciled.splice(Math.max(0, Math.min(insertionIndex, reconciled.length)), 0, replacement as T);
  return reconciled;
}
