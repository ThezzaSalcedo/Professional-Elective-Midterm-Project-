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
 * Point 1 & 2: Sequential Loading and error handling.
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

  useEffect(() => {
    // GUARD: The app must NOT attempt to fetch the collection until auth is confirmed 
    // and the user's document has been retrieved.
    if (!memoizedTargetRefOrQuery || isUserLoading || isProfileLoading || !user) {
      setData(null);
      setIsLoading(isUserLoading || isProfileLoading);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

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
      },
      (firestoreError: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        let finalError: Error = firestoreError;

        // Point 4: Custom Error Message for Permission Denied
        if (firestoreError.code === 'permission-denied') {
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
  return { data, isLoading, error };
}

/**
 * Specialized hook for MOA collections with Field Masking and Query Stabilization.
 */
export function useMoaCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined
): UseCollectionResult<T> {
  const { user } = useAuth(); // AuthContext is tied to profile
  const { data: rawData, isLoading, error } = useCollection<T>(memoizedTargetRefOrQuery);

  const maskedData = useMemo(() => {
    if (!rawData) return null;
    if (user?.role === 'student') {
      return rawData.map(item => {
        const masked = { ...item };
        delete (masked as any).auditTrail;
        delete (masked as any).isDeleted;
        return masked;
      });
    }
    return rawData;
  }, [rawData, user?.role]);

  return { data: maskedData, isLoading, error };
}