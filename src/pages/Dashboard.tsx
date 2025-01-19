import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

function Dashboard() {
  const user = auth.currentUser;
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [amountPHP, setAmountPHP] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddExpense = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        date,
        category,
        amountPHP: Number(amountPHP),
        createdAt: serverTimestamp()
      });
      setDate('');
      setCategory('');
      setAmountPHP('');
    } catch (error) {
      console.error('Add expense error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div style={{ margin: '2rem' }}>
      <h1>Dashboard</h1>
      <div>
        <label>Date:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>Category:</label>
        <input type="text" value={category} onChange={e => setCategory(e.target.value)} />
        <label>Amount (PHP):</label>
        <input type="number" value={amountPHP} onChange={e => setAmountPHP(e.target.value)} />
        <button onClick={handleAddExpense}>Add Expense</button>
      </div>
      <button onClick={handleSignOut}>Sign Out</button>
      <h2>Expense List</h2>
      <table border={1} style={{ marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Amount(PHP)</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.date}</td>
              <td>{exp.category}</td>
              <td>{exp.amountPHP}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard; 