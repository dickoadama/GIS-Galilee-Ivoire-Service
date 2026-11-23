import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  SUPER_ADMIN_EMAIL,
} from '../firebase';
import {
  AuditLog,
  ChatMessage,
  Conversation,
  Invoice,
  InvoiceLineItem,
  Member,
  Product,
  PurchaseOrder,
  PurchaseOrderLineItem,
  StaffRole,
  StoreSettings,
  UserRole,
} from '../types/app';

export function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export async function syncSignedInUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<UserRole> {
  const cleanEmail = email.trim().toLowerCase();
  let resolvedRole: UserRole = 'client';

  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    resolvedRole = 'super_admin';
  } else {
    // 1. Check existing member doc by uid
    const memberRef = doc(db, 'members', uid);
    try {
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        resolvedRole = memberSnap.data().active === true
          ? (memberSnap.data().role as UserRole)
          : 'client';
      } else if (cleanEmail) {
        // 2. Check pre-registered email invite
        const inviteRef = doc(db, 'memberInvites', cleanEmail);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists() && inviteSnap.data().active === true) {
          const inviteData = inviteSnap.data();
          resolvedRole = inviteData.role as UserRole;
          const viewerUids = Array.from(
            new Set(
              [uid, inviteData.assignedByUid].filter(
                (v): v is string => typeof v === 'string' && v.length > 0
              )
            )
          ).slice(0, 30);
          await setDoc(memberRef, {
            id: uid,
            uid,
            fullName: inviteData.fullName || displayName || cleanEmail,
            email: cleanEmail,
            phone: inviteData.phone || '',
            role: resolvedRole,
            active: true,
            assignedByUid: inviteData.assignedByUid || uid,
            staffViewerUids: viewerUids,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      // Fallback safely to client if invite doesn't exist
      console.warn('Role resolution fallback:', err);
    }
  }

  // Upsert public profile + private PII
  const userRef = doc(db, 'users', uid);
  try {
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        uid,
        displayName: displayName || cleanEmail.split('@')[0] || 'Utilisateur GIS',
        role: resolvedRole,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (existing.data().role !== resolvedRole) {
      await updateDoc(userRef, {
        role: resolvedRole,
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(
      doc(db, 'users', uid, 'private', 'info'),
      {
        uid,
        email: cleanEmail,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  return resolvedRole;
}

export async function seedProductsIfEmpty(
  defaultProducts: Product[]
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (!snap.empty) return;
    const batch = writeBatch(db);
    for (const prod of defaultProducts) {
      const ref = doc(db, 'products', prod.id);
      batch.set(ref, {
        ...prod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
}

export async function saveProductDoc(product: Product, isNew: boolean): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const ref = doc(db, 'products', product.id);
    const existingSnap = isNew ? null : await getDoc(ref);
    if (isNew || (existingSnap && !existingSnap.exists())) {
      await setDoc(ref, {
        id: product.id,
        barcode: (product.barcode || '').trim().slice(0, 64),
        pole: product.pole,
        category: product.category,
        name: product.name,
        unitLabel: product.unitLabel,
        priceFcfa: product.priceFcfa,
        wholesalePriceFcfa: product.wholesalePriceFcfa,
        wholesaleMinQty: product.wholesaleMinQty,
        purchaseCostFcfa: Math.max(
          0,
          Number(
            product.purchaseCostFcfa ??
              Math.round((product.wholesalePriceFcfa * 0.88) / 50) * 50
          )
        ),
        targetMarginPct: Math.min(
          500,
          Math.max(0, Number(product.targetMarginPct ?? 18))
        ),
        stockQty: product.stockQty,
        criticalStockThreshold: Math.max(0, Number(product.criticalStockThreshold ?? 15)),
        inStock: product.inStock,
        priorityScore: product.priorityScore,
        orderCount: product.orderCount,
        outflowQty: product.outflowQty,
        description: product.description || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        barcode: (product.barcode || '').trim().slice(0, 64),
        pole: product.pole,
        category: product.category,
        name: product.name,
        unitLabel: product.unitLabel,
        priceFcfa: product.priceFcfa,
        wholesalePriceFcfa: product.wholesalePriceFcfa,
        wholesaleMinQty: product.wholesaleMinQty,
        purchaseCostFcfa: Math.max(
          0,
          Number(
            product.purchaseCostFcfa ??
              Math.round((product.wholesalePriceFcfa * 0.88) / 50) * 50
          )
        ),
        targetMarginPct: Math.min(
          500,
          Math.max(0, Number(product.targetMarginPct ?? 18))
        ),
        stockQty: product.stockQty,
        criticalStockThreshold: Math.max(0, Number(product.criticalStockThreshold ?? 15)),
        inStock: product.inStock,
        priorityScore: product.priorityScore,
        orderCount: product.orderCount,
        outflowQty: product.outflowQty,
        description: product.description || '',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductDoc(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMemberAndInviteDoc(
  member: Member,
  isNew: boolean
): Promise<void> {
  const actorUid = auth.currentUser?.uid || member.assignedByUid;
  const memberPath = `members/${member.id}`;
  const cleanEmail = member.email.trim().toLowerCase();

  try {
    if (isNew) {
      await setDoc(doc(db, 'members', member.id), {
        id: member.id,
        ...(member.uid ? { uid: member.uid } : {}),
        fullName: member.fullName,
        email: cleanEmail,
        phone: member.phone,
        role: member.role,
        active: member.active,
        assignedByUid: actorUid,
        staffViewerUids: member.staffViewerUids.length
          ? member.staffViewerUids.slice(0, 30)
          : [actorUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'members', member.id), {
        fullName: member.fullName,
        email: cleanEmail,
        phone: member.phone,
        role: member.role,
        active: member.active,
        staffViewerUids: member.staffViewerUids.slice(0, 30),
        updatedAt: serverTimestamp(),
      });
    }

    if (cleanEmail) {
      await setDoc(doc(db, 'memberInvites', cleanEmail), {
        email: cleanEmail,
        fullName: member.fullName,
        phone: member.phone,
        role: member.role,
        active: member.active,
        memberId: member.id,
        assignedByUid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, memberPath);
  }
}

export async function deleteMemberAndInviteDoc(member: Member): Promise<void> {
  try {
    await deleteDoc(doc(db, 'members', member.id));
    const cleanEmail = member.email.trim().toLowerCase();
    if (cleanEmail) {
      await deleteDoc(doc(db, 'memberInvites', cleanEmail));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `members/${member.id}`);
  }
}

export async function saveInvoiceWithItemsDoc(
  invoice: Invoice,
  isNew: boolean
): Promise<void> {
  const invPath = `invoices/${invoice.id}`;
  try {
    const invRef = doc(db, 'invoices', invoice.id);
    const payload = {
      id: invoice.id,
      docType: invoice.docType,
      code: invoice.code,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      deliveryMode: invoice.deliveryMode,
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      discountFcfa: invoice.discountFcfa,
      deliveryFeeFcfa: invoice.deliveryFeeFcfa,
      cimentQuincaillerieSubtotal: invoice.cimentQuincaillerieSubtotal,
      boissonsSubtotal: invoice.boissonsSubtotal,
      totalFcfa: invoice.totalFcfa,
      notes: invoice.notes || '',
      createdByUid: invoice.createdByUid,
      createdByName: invoice.createdByName,
      assignedLoaderName: invoice.assignedLoaderName || '',
      assignedDriverName: invoice.assignedDriverName || '',
      staffReaderUids: invoice.staffReaderUids.slice(0, 30),
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      await setDoc(invRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(invRef, payload);
      const existingItems = await getDocs(collection(db, 'invoices', invoice.id, 'items'));
      const delBatch = writeBatch(db);
      existingItems.forEach((d) => delBatch.delete(d.ref));
      await delBatch.commit();
    }

    const itemBatch = writeBatch(db);
    invoice.items.forEach((item: InvoiceLineItem) => {
      const itemRef = doc(db, 'invoices', invoice.id, 'items', item.id);
      itemBatch.set(itemRef, {
        id: item.id,
        productId: item.productId,
        pole: item.pole,
        name: item.name,
        unitLabel: item.unitLabel,
        quantity: item.quantity,
        appliedUnitPrice: item.appliedUnitPrice,
        isWholesale: item.isWholesale,
        lineTotal: item.lineTotal,
        createdByUid: invoice.createdByUid,
        staffReaderUids: invoice.staffReaderUids.slice(0, 30),
      });
    });
    await itemBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, invPath);
  }
}

export async function deleteInvoiceWithItemsDoc(invoiceId: string): Promise<void> {
  try {
    const itemsSnap = await getDocs(collection(db, 'invoices', invoiceId, 'items'));
    const batch = writeBatch(db);
    itemsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'invoices', invoiceId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invoices/${invoiceId}`);
  }
}

export async function savePurchaseOrderWithItemsDoc(
  po: PurchaseOrder,
  isNew: boolean
): Promise<void> {
  const poPath = `purchaseOrders/${po.id}`;
  const actorUid = auth.currentUser?.uid || po.createdByUid;
  const safeReaderUids = Array.from(
    new Set([actorUid, ...po.staffReaderUids].filter(Boolean))
  ).slice(0, 30);

  try {
    const poRef = doc(db, 'purchaseOrders', po.id);
    const basePayload = {
      id: po.id,
      code: po.code.trim().slice(0, 40),
      poleScope: po.poleScope,
      supplierName: po.supplierName.trim().slice(0, 140),
      supplierPhone: (po.supplierPhone || '').trim().slice(0, 40),
      supplierAddress: (po.supplierAddress || '').trim().slice(0, 240),
      expectedDeliveryDate: (po.expectedDeliveryDate || '').trim().slice(0, 20),
      status: po.status,
      totalEstimatedFcfa: Math.max(0, Number(po.totalEstimatedFcfa) || 0),
      notes: (po.notes || '').trim().slice(0, 500),
      createdByName: po.createdByName.trim().slice(0, 120) || 'Gestionnaire GIS',
      staffReaderUids: safeReaderUids,
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      await setDoc(poRef, {
        ...basePayload,
        createdByUid: actorUid,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(poRef, {
        ...basePayload,
        createdByUid: po.createdByUid || actorUid,
      });
      const existingItems = await getDocs(
        collection(db, 'purchaseOrders', po.id, 'items')
      );
      if (!existingItems.empty) {
        const delBatch = writeBatch(db);
        existingItems.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
    }

    const itemBatch = writeBatch(db);
    po.items.forEach((item: PurchaseOrderLineItem) => {
      const itemRef = doc(db, 'purchaseOrders', po.id, 'items', item.id);
      itemBatch.set(itemRef, {
        id: item.id,
        productId: item.productId,
        pole: item.pole,
        name: item.name.trim().slice(0, 160),
        unitLabel: item.unitLabel.trim().slice(0, 80),
        currentStockAtOrder: Math.max(0, Number(item.currentStockAtOrder) || 0),
        criticalThreshold: Math.max(0, Number(item.criticalThreshold) || 0),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        estimatedUnitCostFcfa: Math.max(
          0,
          Number(item.estimatedUnitCostFcfa) || 0
        ),
        lineTotalFcfa: Math.max(0, Number(item.lineTotalFcfa) || 0),
        createdByUid: po.createdByUid || actorUid,
        staffReaderUids: safeReaderUids,
      });
    });
    await itemBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, poPath);
  }
}

export async function deletePurchaseOrderWithItemsDoc(
  purchaseOrderId: string
): Promise<void> {
  try {
    const itemsSnap = await getDocs(
      collection(db, 'purchaseOrders', purchaseOrderId, 'items')
    );
    const batch = writeBatch(db);
    itemsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'purchaseOrders', purchaseOrderId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `purchaseOrders/${purchaseOrderId}`
    );
  }
}

export async function updatePurchaseOrderStatusDoc(
  purchaseOrderId: string,
  status: PurchaseOrder['status']
): Promise<void> {
  try {
    await updateDoc(doc(db, 'purchaseOrders', purchaseOrderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `purchaseOrders/${purchaseOrderId}`
    );
  }
}

export async function createConversationDoc(
  conversation: Conversation
): Promise<void> {
  try {
    await setDoc(doc(db, 'conversations', conversation.id), {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      isTeamChannel: conversation.isTeamChannel,
      participantUids: conversation.participantUids.slice(0, 30),
      lastMessageText: conversation.lastMessageText || '',
      lastSenderName: conversation.lastSenderName || '',
      createdByUid: conversation.createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `conversations/${conversation.id}`
    );
  }
}

export async function sendMessageDoc(
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  try {
    const msgRef = doc(
      db,
      'conversations',
      conversationId,
      'messages',
      message.id
    );
    await setDoc(msgRef, {
      id: message.id,
      senderUid: message.senderUid,
      senderName: message.senderName,
      senderRole: message.senderRole,
      text: message.text,
      participantUids: message.participantUids.slice(0, 30),
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessageText: message.text.slice(0, 280),
      lastSenderName: message.senderName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversationId}/messages/${message.id}`
    );
  }
}

export async function saveSettingsDoc(settings: StoreSettings): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'main'), {
      companyName: settings.poster.companyName,
      brandAcronym: settings.poster.brandAcronym,
      tagline: settings.poster.tagline,
      location: settings.poster.location,
      closingSlogan: settings.poster.closingSlogan,
      phones: settings.poster.phones,
      hardware: settings.poster.hardware,
      beverages: settings.poster.beverages,
      commitments: settings.poster.commitments,
      hoursWeekdays: settings.hoursWeekdays,
      hoursSaturday: settings.hoursSaturday,
      hoursSunday: settings.hoursSunday,
      currencyLabel: settings.currencyLabel,
      deliveryFeeFcfa: settings.deliveryFeeFcfa,
      freeDeliveryThresholdFcfa: settings.freeDeliveryThresholdFcfa,
      whatsappPhone: settings.whatsappPhone,
      email: settings.email,
      acceptedPayments: settings.acceptedPayments,
      theme: settings.theme,
      defaultModel: settings.defaultModel,
      defaultFormat: settings.defaultFormat,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/main');
  }
}

export async function writeAuditLogDoc(
  actorUid: string,
  actorName: string,
  actorRole: UserRole | StaffRole,
  action: string,
  targetLabel?: string
): Promise<void> {
  const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    const logData: Omit<AuditLog, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      id,
      actorUid,
      actorName,
      actorRole,
      action: action.slice(0, 155),
      ...(targetLabel ? { targetLabel: targetLabel.slice(0, 195) } : {}),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'auditLogs', id), logData);
  } catch (error) {
    console.warn('Audit log write skipped:', error);
  }
}
