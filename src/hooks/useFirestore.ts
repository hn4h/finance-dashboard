import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    type QueryConstraint,
    type DocumentData,
    type QuerySnapshot,
    type FirestoreError
} from 'firebase/firestore';
import { db } from '../firebase';

export function useFirestoreQuery<T>(
    collectionName: string,
    queryConstraints: QueryConstraint[] = [],
    dependencies: any[] = []
): { data: T[] | undefined, error: FirestoreError | null, loading: boolean } {
    const [data, setData] = useState<T[] | undefined>(undefined);
    const [error, setError] = useState<FirestoreError | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, collectionName), ...queryConstraints);

        const unsubscribe = onSnapshot(q,
            (snapshot: QuerySnapshot<DocumentData>) => {
                const results = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id // use firestore string id
                })) as T[];
                setData(results);
                setLoading(false);
            },
            (err: FirestoreError) => {
                console.error("Firestore Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, dependencies);

    return { data, error, loading };
}
