"use client"

import { useState, useEffect } from 'react';
import { MOA, MOAStatus, AuditLog } from './types';
import { mockMOAs } from './mock-data';

export function useMoaStore() {
  const [moas, setMoas] = useState<MOA[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('moa_records');
    if (stored) {
      setMoas(JSON.parse(stored));
    } else {
      setMoas(mockMOAs);
      localStorage.setItem('moa_records', JSON.stringify(mockMOAs));
    }
  }, []);

  const saveToStorage = (updated: MOA[]) => {
    setMoas(updated);
    localStorage.setItem('moa_records', JSON.stringify(updated));
  };

  const addMoa = (moaData: Omit<MOA, 'id' | 'auditTrail' | 'isDeleted'>, userName: string) => {
    const newMoa: MOA = {
      ...moaData,
      id: Math.random().toString(36).substr(2, 9),
      isDeleted: false,
      auditTrail: [{
        id: Math.random().toString(36).substr(2, 9),
        userName,
        timestamp: new Date().toISOString(),
        operation: 'Insert'
      }]
    };
    saveToStorage([newMoa, ...moas]);
  };

  const updateMoa = (id: string, updates: Partial<MOA>, userName: string) => {
    const updated = moas.map(moa => {
      if (moa.id === id) {
        const auditLog: AuditLog = {
          id: Math.random().toString(36).substr(2, 9),
          userName,
          timestamp: new Date().toISOString(),
          operation: 'Edit'
        };
        return { ...moa, ...updates, auditTrail: [...moa.auditTrail, auditLog] };
      }
      return moa;
    });
    saveToStorage(updated);
  };

  const softDeleteMoa = (id: string, userName: string) => {
    const updated = moas.map(moa => {
      if (moa.id === id) {
        const auditLog: AuditLog = {
          id: Math.random().toString(36).substr(2, 9),
          userName,
          timestamp: new Date().toISOString(),
          operation: 'Soft-Delete'
        };
        return { ...moa, isDeleted: true, auditTrail: [...moa.auditTrail, auditLog] };
      }
      return moa;
    });
    saveToStorage(updated);
  };

  const recoverMoa = (id: string, userName: string) => {
    const updated = moas.map(moa => {
      if (moa.id === id) {
        const auditLog: AuditLog = {
          id: Math.random().toString(36).substr(2, 9),
          userName,
          timestamp: new Date().toISOString(),
          operation: 'Recover'
        };
        return { ...moa, isDeleted: false, auditTrail: [...moa.auditTrail, auditLog] };
      }
      return moa;
    });
    saveToStorage(updated);
  };

  return { moas, addMoa, updateMoa, softDeleteMoa, recoverMoa };
}