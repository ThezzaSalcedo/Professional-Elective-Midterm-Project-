
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '../provider';
import { useAuth } from '@/app/context/AuthContext';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
  isIndexBuilding?: boolean;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * Sequential Loading and enhanced error handling for missing indexes.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  const { isUserLoading, isProfileLoading, user } = useUser();
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery || isUserLoading || isProfileLoading || !user) {
      setData(null);
      setIsLoading(isUserLoading || isProfileLoading);
      setError(null);
      setIsIndexBuilding(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsIndexBuilding(false);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
        setIsIndexBuilding(false);
      },
      (firestoreError: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        let finalError: Error = firestoreError;

        if (firestoreError.code === 'failed-precondition') {
          setIsIndexBuilding(true);
          finalError = new Error('The dashboard is currently optimizing its database. This may take a few minutes.');
        } 
        else if (firestoreError.code === 'permission-denied') {
          finalError = new Error('Access Restricted: Please contact an Admin to verify your account rights.');
          
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });
          errorEmitter.emit('permission-error', contextualError);
        }

        setError(finalError);
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, isUserLoading, isProfileLoading, user]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error, isIndexBuilding };
}

/**
 * Specialized hook for MOA collections with Role-Based Field Masking.
 */
export function useMoaCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined
): UseCollectionResult<T> {
  const { user } = useAuth();
  const { data: rawData, isLoading, error, isIndexBuilding } = useCollection<T>(memoizedTargetRefOrQuery);

  const maskedData = useMemo(() => {
    if (!rawData) return null;
    
    // Security layer: Mask sensitive fields for non-admins
    return rawData.map(item => {
      const masked = { ...item };
      
      // Faculty and Students cannot see the audit trail
      if (user?.role !== 'admin') {
        delete (masked as any).auditTrail;
      }
      
      // Students cannot see soft-deletion flags (they shouldn't see deleted records anyway)
      if (user?.role === 'student') {
        delete (masked as any).isDeleted;
      }
      
      return masked;
    });
  }, [rawData, user?.role]);

  return { data: maskedData, isLoading, error, isIndexBuilding };
}
