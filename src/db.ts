import { collection, CollectionReference, type DocumentData } from 'firebase/firestore'
import { db as firestoreDb } from './firebase'

export interface Transaction {
    id?: string
    emailId: string        // unique — prevent duplicate
    amount: number         // negative = expense, positive = income
    description: string
    date: number           // We use timestamps (milliseconds) to simplify serialization
    category: string | null
    status: 'unclassified' | 'classified'
}

export interface Setting {
    key: string
    value: unknown
    id?: string
}

export interface IncomeEntry {
    id?: string
    amount: number
    source: string         // "Lương", "Freelance", "Đầu tư"...
    date: number
    goalId?: string        // link to a goal (optional)
    note?: string
}

export interface Goal {
    id?: string
    name: string
    targetAmount: number
    deadline?: number
    status: 'active' | 'done'
    createdAt: number
}

// Helper to get typed collections
const createCollection = <T = DocumentData>(collectionName: string) => {
    return collection(firestoreDb, collectionName) as CollectionReference<T>
}

export const db = {
    transactions: createCollection<Transaction>('transactions'),
    settings: createCollection<Setting>('settings'),
    incomes: createCollection<IncomeEntry>('incomes'),
    goals: createCollection<Goal>('goals')
}
