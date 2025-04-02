import { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { FiMenu, FiX } from 'react-icons/fi';

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

// Improve the Connection interface
interface Connection {
  userId: string;
  // Add any other properties you might need in the future
}

// Add types for chart data
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderWidth: number;
  }[];
}

// Add types for summary data
interface CategorySummary {
  totalPHP: number;
  totalJPY: number;
}

interface SummaryData {
  [category: string]: CategorySummary;
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
  const [connections, setConnections] = useState<Connection[]>([]);
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

  // Add state for user dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Get current user's ID and partner info
  const currentUserId = auth.currentUser?.uid || '';
  const partnerInfo = connections.length > 0 ? connections[0] : null;

  // パートナー接続を取得
  useEffect(() => {
    if (!user) return;
    
    const fetchConnections = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // connectionsフィールドを確認し、適切な形式に変換
        if (userData.connections && userData.connections.length > 0) {
          // 文字列の配列からConnectionオブジェクトの配列に変換
          const connectionObjects = userData.connections.map((id: string) => ({ userId: id }));
          setConnections(connectionObjects);
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
  const ViewSelector = (): JSX.Element => (
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
            setViewingUserId(connections[0].userId);
            console.log('Switched to Partner expenses:', connections[0].userId); // デバッグ用
          }}
          className={`px-4 py-2 rounded-md transition-colors ${
            viewingUserId === connections[0].userId
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
  const FilterSelector = (): JSX.Element => (
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

  // Update this function to use selected month/year
  const calculateSummaryData = () => {
    // Get selected month's start and end dates
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    
    // Filter expenses for selected month
    const expensesThisMonth = expenses.filter(exp => {
      return exp.date >= startDateStr && exp.date <= endDateStr;
    });
    
    // Group by category and sum amounts
    const summaryData: SummaryData = {};
    
    expensesThisMonth.forEach(exp => {
      if (!summaryData[exp.category]) {
        summaryData[exp.category] = { totalPHP: 0, totalJPY: 0 };
      }
      summaryData[exp.category].totalPHP += exp.amountPHP;
      summaryData[exp.category].totalJPY += exp.amountJPY;
    });
    
    return {
      summaryData,
      currentMonthName: startOfMonth.toLocaleString('default', { month: 'long' }),
      currentYear: selectedYear
    };
  };

  // Month selector component
  const MonthYearSelector = (): JSX.Element => {
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

  // Update the StatsTab component to include ViewSelector
  const StatsTab = (): JSX.Element => {
    const { summaryData, currentMonthName, currentYear } = calculateSummaryData();
    const categories = Object.keys(summaryData);
    
    // Skip rendering if no data
    if (categories.length === 0) {
      return (
        <div className="p-6 text-center">
          <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-700">
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
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add an expense
            </button>
          )}
        </div>
      );
    }
    
    // Prepare data for charts
    const pieData: ChartData = {
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
        <div className="bg-slate-100 rounded-xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-700">
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
  const SparkleEffect = (): JSX.Element | null => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
      {/* Add SparkleEffect component right after the opening div */}
      <SparkleEffect />
      
      {/* Navigation Bar */}
      <nav className="bg-slate-100 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">ExpenseTracker</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {/* Desktop Navigation */}
                <button
                  onClick={() => setCurrentTab("list")}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentTab === "list"
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Expense List
                </button>
                <button
                  onClick={() => setCurrentTab("stats")}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentTab === "stats"
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Monthly Summary
                </button>
              </div>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {/* User dropdown menu */}
              <div className="ml-3 relative" ref={userMenuRef}>
                <div>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="bg-slate-200 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 p-2"
                  >
                    <span className="sr-only">Open user menu</span>
                    <span className="text-gray-600">User</span>
                  </button>
                </div>
                
                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    {/* User ID display */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-500">Logged in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{currentUserId}</p>
                    </div>
                    
                    {/* Partner connection status */}
                    {partnerInfo && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-500 text-xs">👥</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">Connected with Partner</p>
                            <p className="text-xs text-gray-500 truncate">{partnerInfo.userId}</p>
                          </div>
                        </div>
                        <Link
                          to="/connect"
                          className="mt-2 block w-full text-center px-4 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                        >
                          Manage Connection
                        </Link>
                      </div>
                    )}
                    
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <FiX className="block h-6 w-6" />
                ) : (
                  <FiMenu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <button
                onClick={() => {
                  setCurrentTab("list");
                  setMobileMenuOpen(false);
                }}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  currentTab === "list"
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                Expense List
              </button>
              <button
                onClick={() => {
                  setCurrentTab("stats");
                  setMobileMenuOpen(false);
                }}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  currentTab === "stats"
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                Monthly Summary
              </button>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2 flex items-center justify-center">
                    U
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">User</div>
                  <div className="text-sm text-gray-500 truncate">{currentUserId}</div>
                </div>
              </div>
              
              {/* Partner connection status for mobile */}
              {partnerInfo && (
                <div className="mt-3 px-4 py-2 border-t border-b border-gray-200 bg-green-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-green-500">👥</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Connected with Partner</p>
                      <p className="text-xs text-gray-500 truncate">{partnerInfo.userId}</p>
                    </div>
                  </div>
                  <Link
                    to="/connect"
                    className="mt-2 block w-full text-center px-4 py-2 text-xs font-medium text-indigo-600 bg-white rounded-md border border-indigo-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Manage Connection
                  </Link>
                </div>
              )}
              
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Input Form - Only show when viewing own expenses and on list tab */}
        {!viewingUserId && currentTab === "list" && (
          <div className="bg-slate-100 rounded-xl shadow-xl p-6">
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
          <div className="bg-slate-100 rounded-xl shadow-xl p-6 overflow-x-auto">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-700">
                  {viewingUserId ? 'Partner\'s expense list' : 'Expense list'}
                </h2>
                <ViewSelector />
              </div>
              <FilterSelector />
            </div>
            <table className="w-full min-w-[800px] md:min-w-full border-b border-t border-slate-200 text-sm md:text-base">
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