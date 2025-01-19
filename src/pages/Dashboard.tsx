import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

function Dashboard() {
  const user = auth.currentUser;
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [amountPHP, setAmountPHP] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editAmountPHP, setEditAmountPHP] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const categories = [
    'Food',
    'Transport',
    'Equipment',
    'Travel',
    'Entertainment',
    'Clothing',
    'Rent',
    'Medical',
    'Beauty',
    'Self-Development',
    'Investment',
    'Electric Bill',
    'Water Bill',
    'Internet & Phone',
    'Other'
  ];

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
      const docRef = await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        date,
        category,
        amountPHP: Number(amountPHP),
        description,
        createdAt: serverTimestamp()
      });
      setExpenses(prevExpenses => [
        ...prevExpenses,
        { id: docRef.id, date, category, amountPHP: Number(amountPHP), description }
      ]);
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setAmountPHP('');
      setDescription('');
    } catch (error) {
      console.error('Add expense error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleEditExpense = (expense: any) => {
    setEditExpenseId(expense.id);
    setEditAmountPHP(expense.amountPHP.toString());
    setEditDescription(expense.description);
  };

  const handleUpdateExpense = async () => {
    if (!user || !editExpenseId) return;
    try {
        const expenseRef = doc(db, 'expenses', editExpenseId);
        await updateDoc(expenseRef, {
            amountPHP: Number(editAmountPHP),
            description: editDescription,
            updatedAt: serverTimestamp()
        });
        setEditExpenseId(null);
        setEditAmountPHP('');
        setEditDescription('');
    } catch (error) {
        console.error('Update expense error:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    try {
        const expenseRef = doc(db, 'expenses', id);
        await deleteDoc(expenseRef);
    } catch (error) {
        console.error('Delete expense error:', error);
    }
  };

  return (
    <div style={{ margin: '2rem' }}>
      <h1>Dashboard</h1>
      <div>
        <label>Date:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>Category:</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label>Description:</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
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
            <th>Description</th>
            <th>Amount(PHP)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.date}</td>
              <td>{exp.category}</td>
              <td>
                {editExpenseId === exp.id ? (
                  <input
                    type="text"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                  />
                ) : (
                  exp.description
                )}
              </td>
              <td>
                {editExpenseId === exp.id ? (
                  <input
                    type="number"
                    value={editAmountPHP}
                    onChange={e => setEditAmountPHP(e.target.value)}
                  />
                ) : (
                  exp.amountPHP
                )}
              </td>
              <td>
                {editExpenseId === exp.id ? (
                  <button onClick={handleUpdateExpense}>Update</button>
                ) : (
                  <>
                    <button onClick={() => handleEditExpense(exp)}>Edit</button>
                    <button onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard; 