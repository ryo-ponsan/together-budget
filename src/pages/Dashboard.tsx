import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Add this interface at the top of the file
interface Expense {
  id: string;
  date: string;
  category: string;
  amountPHP: number;
  amountJPY: number;
  description: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string;
}

function Dashboard() {
  const user = auth.currentUser;
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [amountPHP, setAmountPHP] = useState('');
  const [amountJPY, setAmountJPY] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [description, setDescription] = useState('');
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editAmountPHP, setEditAmountPHP] = useState<string>('');
  const [editAmountJPY, setEditAmountJPY] = useState<string>('');
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

  // 為替レートの定数を追加
  const PHP_TO_JPY_RATE = 2.67;  // 1 PHP = 2.67 JPY
  const JPY_TO_PHP_RATE = 0.37;  // 1 JPY = 0.37 PHP

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Expense[];
      // Sort expenses by createdAt timestamp in descending order
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setExpenses(sortedData);
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
        amountJPY: Number(amountJPY),
        description,
        createdAt: serverTimestamp()
      });
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setAmountPHP('');
      setAmountJPY('');
      setDescription('');
    } catch (error) {
      console.error('Add expense error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpenseId(expense.id);
    setEditAmountPHP(expense.amountPHP.toString());
    setEditAmountJPY(expense.amountJPY.toString());
    setEditDescription(expense.description);
  };

  const handleUpdateExpense = async () => {
    if (!user || !editExpenseId) return;
    try {
        const expenseRef = doc(db, 'expenses', editExpenseId);
        await updateDoc(expenseRef, {
            amountPHP: Number(editAmountPHP),
            amountJPY: Number(editAmountJPY),
            description: editDescription,
            updatedAt: serverTimestamp()
        });
        setEditExpenseId(null);
        setEditAmountPHP('');
        setEditAmountJPY('');
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
        setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== id));
    } catch (error) {
        console.error('Delete expense error:', error);
    }
  };

  // amountPHPの入力ハンドラーを更新
  const handlePHPChange = (value: string) => {
    setAmountPHP(value);
    if (value) {
      // PHPからJPYを計算
      const jpyAmount = (Number(value) * PHP_TO_JPY_RATE).toFixed(2);
      setAmountJPY(jpyAmount);
    } else {
      setAmountJPY('');
    }
  };

  // amountJPYの入力ハンドラーを更新
  const handleJPYChange = (value: string) => {
    setAmountJPY(value);
    if (value) {
      // JPYからPHPを計算
      const phpAmount = (Number(value) * JPY_TO_PHP_RATE).toFixed(2);
      setAmountPHP(phpAmount);
    } else {
      setAmountPHP('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Dashboard
            </h1>
            <div className="text-gray-600 text-sm mt-2">
              <p>PHP_TO_JPY_RATE: 1 PHP = {PHP_TO_JPY_RATE} JPY</p>
              <p>JPY_TO_PHP_RATE: 1 JPY = {JPY_TO_PHP_RATE} PHP</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-4 md:mt-0 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-gray-700">Date:</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-gray-700">Category:</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-gray-700">Description:</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-gray-700">Amount (PHP):</label>
              <input
                type="number"
                value={amountPHP}
                onChange={e => handlePHPChange(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-gray-700">Amount (JPY):</label>
              <input
                type="number"
                value={amountJPY}
                onChange={e => handleJPYChange(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddExpense}
                className="w-full p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6 overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Expense List</h2>
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-gray-600">Date</th>
                <th className="p-3 text-left text-gray-600">Category</th>
                <th className="p-3 text-left text-gray-600">Description</th>
                <th className="p-3 text-left text-gray-600">Amount(PHP)</th>
                <th className="p-3 text-left text-gray-600">Amount(JPY)</th>
                <th className="p-3 text-left text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="p-3">{exp.date}</td>
                  <td className="p-3">{exp.category}</td>
                  <td className="p-3">
                    {editExpenseId === exp.id ? (
                      <input
                        type="text"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      exp.description
                    )}
                  </td>
                  <td className="p-3">
                    {editExpenseId === exp.id ? (
                      <input
                        type="number"
                        value={editAmountPHP}
                        onChange={e => setEditAmountPHP(e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      exp.amountPHP
                    )}
                  </td>
                  <td className="p-3">
                    {editExpenseId === exp.id ? (
                      <input
                        type="number"
                        value={editAmountJPY}
                        onChange={e => setEditAmountJPY(e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      exp.amountJPY
                    )}
                  </td>
                  <td className="p-3">
                    {editExpenseId === exp.id ? (
                      <button
                        onClick={handleUpdateExpense}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Update
                      </button>
                    ) : (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEditExpense(exp)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 