import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    type QueryConstraint,
    type FirestoreError,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface QueryState<T> {
    key: string;
    data: T[] | undefined;
    error: FirestoreError | null;
}

/**
 * Live Firestore query. `data` is undefined while loading and [] on error.
 * Re-subscribes when the Firebase user changes, because security rules reject
 * reads before sign-in and a rejected listener never recovers on its own.
 * Constraints are captured on (re)subscribe; pass `dependencies` if they change.
 */
export function useFirestoreQuery<T>(
    collectionName: string,
    queryConstraints: QueryConstraint[] = [],
    dependencies: unknown[] = [],
): { data: T[] | undefined; error: FirestoreError | null; loading: boolean } {
    const { firebaseUser } = useAuth();
    const key = `${collectionName}|${firebaseUser?.uid ?? ''}|${JSON.stringify(dependencies)}`;
    const [state, setState] = useState<QueryState<T>>({ key, data: undefined, error: null });

    useEffect(() => {
        const q = query(collection(db, collectionName), ...queryConstraints);
        return onSnapshot(
            q,
            snapshot => setState({ key, data: snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as T), error: null }),
            err => {
                console.error('Firestore Error:', err);
                setState({ key, data: [], error: err });
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers collection, user and caller deps
    }, [key]);

    // Results from a previous subscription are stale until the new one reports
    const current = state.key === key ? state : { data: undefined, error: null };
    return { data: current.data, error: current.error, loading: current.data === undefined };
}
