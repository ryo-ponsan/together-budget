import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().split('T')[0];
    return { start: startOfMonth, end: endOfMonth };
  });
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [currentTab, setCurrentTab] = useState<"list" | "stats">("list");
  
  // Add state for month selection
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

  // パートナー接続を取得
  useEffect(() => {
    if (!user) return;
    
    const fetchConnections = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // connectionsフィールドを確認
        if (userData.connections && userData.connections.length > 0) {
          setConnections(userData.connections);
        }
      }
    };

    fetchConnections();
  }, [user]);

  // 支出データを監視
  useEffect(() => {
    if (!user) return;
    
    const targetUserId = viewingUserId || user.uid;
    console.log('Current viewing userId:', targetUserId); // デバッグ用

    const q = query(
      collection(db, 'expenses'), 
      where('userId', '==', targetUserId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Expense[];
      
      console.log('Fetched expenses:', data); // デバッグ用
      
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setExpenses(sortedData);
    });
    
    return () => {
      unsubscribe();
      setExpenses([]); 
    };
  }, [user, viewingUserId]);

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
      
      // Update sparkle effect duration
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 500); // Reduced to 800ms for better UX
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

  // ヘッダー部分に追加するビューセレクター
  const ViewSelector = () => (
    <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
      <button
        onClick={() => {
          setViewingUserId(null);
          console.log('Switched to My expenses'); // デバッグ用
        }}
        className={`px-4 py-2 rounded-md transition-colors ${
          !viewingUserId 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        My expense
      </button>
      {connections.length > 0 && (
        <button
          onClick={() => {
            setViewingUserId(connections[0]);
            console.log('Switched to Partner expenses:', connections[0]); // デバッグ用
          }}
          className={`px-4 py-2 rounded-md transition-colors ${
            viewingUserId === connections[0]
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Partner's expense
        </button>
      )}
    </div>
  );

  // Add this new function to handle CSV export
  const handleExportCSV = () => {
    // Create CSV content
    const csvContent = filteredExpenses
      .map(exp => {
        return `${exp.date}\t${exp.category}\t${exp.description}\t${exp.amountPHP}\t${exp.amountJPY}`;
      })
      .join('\n');

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${dateFilter.start}-to-${dateFilter.end}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // FilterSelectorコンポーネントを更新
  const FilterSelector = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            <span>{isFilterOpen ? 'Hide Filters' : 'Show Filters'}</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="flex flex-col gap-4 p-4 bg-purple-50 rounded-lg">
          {/* Date Range Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-medium text-gray-700">Date Range:</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className="p-2 border rounded-md text-sm"
              />
              <span>-</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className="p-2 border rounded-md text-sm"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-medium text-gray-700">Categories:</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(prev => 
                      prev.includes(cat) 
                        ? prev.filter(c => c !== cat) 
                        : [...prev, cat]
                    )
                  }}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    categoryFilter.includes(cat)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // フィルター適用後の支出データを計算
  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(exp.category);
    const matchesDate = !dateFilter.start || (exp.date >= dateFilter.start && exp.date <= dateFilter.end);
    return matchesCategory && matchesDate;
  });

  // Update calculateSummaryData to use viewingUserId
  const calculateSummaryData = () => {
    // Get selected month's start and end dates
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    
    // Filter expenses for selected month and current view (my expenses or partner's)
    const filteredExpenses = viewingUserId 
      ? expenses.filter(exp => exp.userId === viewingUserId) 
      : expenses;
    
    const expensesThisMonth = filteredExpenses.filter(exp => {
      return exp.date >= startDateStr && exp.date <= endDateStr;
    });
    
    // Group by category and sum amounts
    const summaryData: {[category: string]: {totalPHP: number, totalJPY: number}} = {};
    
    expensesThisMonth.forEach(exp => {
      if (!summaryData[exp.category]) {
        summaryData[exp.category] = { totalPHP: 0, totalJPY: 0 };
      }
      summaryData[exp.category].totalPHP += exp.amountPHP;
      summaryData[exp.category].totalJPY += exp.amountJPY;
    });
    
    return {
      summaryData,
      expensesThisMonth,
      currentMonthName: startOfMonth.toLocaleString('default', { month: 'long' }),
      currentYear: selectedYear
    };
  };

  // Month selector component
  const MonthYearSelector = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Generate array of years (current year and 2 years back)
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    
    // Handle month change
    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedMonth(parseInt(e.target.value));
    };
    
    // Handle year change
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedYear(parseInt(e.target.value));
    };
    
    // Set to current month
    const setToCurrentMonth = () => {
      const now = new Date();
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
    };
    
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <select 
            value={selectedMonth} 
            onChange={handleMonthChange}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          
          <select 
            value={selectedYear} 
            onChange={handleYearChange}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={setToCurrentMonth}
          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm transition-colors"
        >
          Current Month
        </button>
      </div>
    );
  };

  // Update the StatsTab component
  const StatsTab = () => {
    const { summaryData, expensesThisMonth, currentMonthName, currentYear } = calculateSummaryData();
    const categories = Object.keys(summaryData);
    
    // Skip rendering if no data
    if (categories.length === 0) {
      return (
        <div className="p-6 text-center">
          <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {viewingUserId ? 'Partner\'s Monthly Summary' : 'My Monthly Summary'}
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <ViewSelector />
              <MonthYearSelector />
            </div>
          </div>
          <p className="text-lg text-gray-600">
            No expenses recorded for {viewingUserId ? 'your partner' : 'you'} in {currentMonthName} {currentYear}.
          </p>
          {!viewingUserId && (
            <button 
              onClick={() => setCurrentTab("list")} 
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add an expense
            </button>
          )}
        </div>
      );
    }
    
    // Prepare data for charts
    const pieData = {
      labels: categories,
      datasets: [
        {
          label: 'Expenses (PHP)',
          data: categories.map(cat => summaryData[cat].totalPHP),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)',
            'rgba(83, 102, 255, 0.7)',
            'rgba(78, 252, 152, 0.7)',
            'rgba(209, 91, 91, 0.7)',
          ],
          borderWidth: 1,
        },
      ],
    };
    
    // Calculate totals
    const totalPHP = categories.reduce((sum, cat) => sum + summaryData[cat].totalPHP, 0);
    const totalJPY = categories.reduce((sum, cat) => sum + summaryData[cat].totalJPY, 0);
    
    // Fix the percentage calculation
    const getPercentage = (amount: number) => {
      return ((amount / totalPHP) * 100).toFixed(1);
    };
    
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {viewingUserId ? 'Partner\'s Summary' : 'My Summary'} for {currentMonthName} {currentYear}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ViewSelector />
              <MonthYearSelector />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total amounts */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">PHP</p>
                  <p className="text-2xl font-bold text-indigo-700">{totalPHP.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">JPY</p>
                  <p className="text-2xl font-bold text-purple-700">{totalJPY.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            {/* Pie chart */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Expenses by Category (PHP)</h3>
              <div className="h-64">
                <Pie data={pieData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Category breakdown table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Category Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-gray-50 border-b-2">
                <tr>
                  <th className="p-3 text-left text-gray-600">Category</th>
                  <th className="p-3 text-right text-gray-600">Amount (PHP)</th>
                  <th className="p-3 text-right text-gray-600">Amount (JPY)</th>
                  <th className="p-3 text-right text-gray-600">% of Total (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map(cat => {
                  const { totalPHP, totalJPY } = summaryData[cat];
                  const percentage = getPercentage(totalPHP);
                  
                  return (
                    <tr key={cat} className="hover:bg-gray-50">
                      <td className="p-3">{cat}</td>
                      <td className="p-3 text-right">{totalPHP.toFixed(2)}</td>
                      <td className="p-3 text-right">{totalJPY.toFixed(2)}</td>
                      <td className="p-3 text-right">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Update SparkleEffect component
  const SparkleEffect = () => {
    if (!showSparkle) return null;
    
    return (
      <div className="fixed inset-0 pointer-events-none bg-black/30 flex items-center justify-center z-50">
        <div className="text-white text-6xl font-bold animate-bounce">
          Add!
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      {/* Add SparkleEffect component right after the opening div */}
      <SparkleEffect />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 md:space-y-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full gap-4">
            <div className="flex flex-wrap gap-2">
              <Link
                to="/connect"
                className={`px-4 py-2 rounded-md transition-colors ${
                  connections.length > 0 
                    ? 'bg-gray-500 text-gray-200 hover:bg-gray-600' // Changed to a darker shade
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                {connections.length > 0 ? 'Change setting' : 'Connect with partner'}
              </Link>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-4">
          <div className="flex space-x-2 border-b">
            <button
              onClick={() => setCurrentTab("list")}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                currentTab === "list"
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Expense List
            </button>
            <button
              onClick={() => setCurrentTab("stats")}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                currentTab === "stats"
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Monthly Summary
            </button>
          </div>
        </div>

        {/* Input Form - Only show when viewing own expenses and on list tab */}
        {!viewingUserId && currentTab === "list" && (
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
        )}

        {/* Tab Content */}
        {currentTab === "list" ? (
          /* Expense List */
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6 overflow-x-auto">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {viewingUserId ? 'Partner\'s expense list' : 'Expense list'}
                </h2>
                <ViewSelector />
              </div>
              <FilterSelector />
            </div>
            <table className="w-full min-w-[800px] md:min-w-full border-b border-t text-sm md:text-base">
              <thead className="bg-gray-50 border-b-2">
                <tr>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Date</th>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Category</th>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Description</th>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Amount(PHP)</th>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Amount(JPY)</th>
                  <th className="p-2 md:p-3 text-left text-gray-600 border-r border-l">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="p-2 md:p-3 border-r border-l">{exp.date}</td>
                    <td className="p-2 md:p-3 border-r border-l">{exp.category}</td>
                    <td className="p-2 md:p-3 border-r border-l">
                      {editExpenseId === exp.id ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          className="w-full p-1 border rounded text-sm"
                        />
                      ) : (
                        exp.description
                      )}
                    </td>
                    <td className="p-2 md:p-3 border-r border-l">
                      {editExpenseId === exp.id ? (
                        <input
                          type="number"
                          value={editAmountPHP}
                          onChange={e => setEditAmountPHP(e.target.value)}
                          className="w-full p-1 border rounded text-sm"
                        />
                      ) : (
                        exp.amountPHP
                      )}
                    </td>
                    <td className="p-2 md:p-3 border-r">
                      {editExpenseId === exp.id ? (
                        <input
                          type="number"
                          value={editAmountJPY}
                          onChange={e => setEditAmountJPY(e.target.value)}
                          className="w-full p-1 border rounded text-sm"
                        />
                      ) : (
                        exp.amountJPY
                      )}
                    </td>
                    <td className="p-2 md:p-3">
                      {!viewingUserId && (
                        <div className="space-x-1 md:space-x-2 border-l">
                          {editExpenseId === exp.id ? (
                            <button
                              onClick={handleUpdateExpense}
                              className="px-2 md:px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditExpense(exp)}
                                className="px-2 md:px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="px-2 md:px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Stats Tab */
          <StatsTab />
        )}
      </div>
    </div>
  );
}

export default Dashboard; 