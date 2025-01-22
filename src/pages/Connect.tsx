import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';

function Connect() {
  const [partnerUserId, setPartnerUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<string[]>([]);
  const currentUser = auth.currentUser;

  // 現在のconnectionsを取得
  useEffect(() => {
    if (!currentUser) return;

    const fetchConnections = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // ユーザードキュメントが存在しない場合は作成
        await setDoc(userRef, {
          connections: [],
          createdAt: new Date()
        });
        setConnections([]);
      } else {
        setConnections(userDoc.data().connections || []);
      }
    };

    fetchConnections();
  }, [currentUser]);

  const handleConnect = async () => {
    if (!partnerUserId.trim() || !currentUser) {
      setMessage('Please enter a user ID');
      return;
    }

    if (partnerUserId === currentUser.uid) {
      setMessage('You cannot use your own ID');
      return;
    }

    setIsLoading(true);
    try {
      // パートナーのユーザードキュメントの存在確認
      const partnerRef = doc(db, 'users', partnerUserId);
      const partnerDoc = await getDoc(partnerRef);

      if (!partnerDoc.exists()) {
        setMessage('User not found');
        return;
      }

      // 既存の接続確認
      if (connections.includes(partnerUserId)) {
        setMessage('Already connected to this user');
        return;
      }

      // 自分のconnectionsに追加
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        connections: arrayUnion(partnerUserId)
      });

      setMessage('Connection completed!');
      setPartnerUserId('');
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (partnerId: string) => {
    if (!currentUser) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        connections: arrayRemove(partnerId)
      });
      setMessage('Disconnection completed!');
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to disconnect');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Connect with partner</h1>
        
        {/* 自分のユーザーID表示 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Your user ID:</h2>
          <div className="bg-gray-100 p-3 rounded-md break-all">
            {currentUser?.uid || 'Loading...'}
          </div>
        </div>

        {/* 現在の接続一覧 */}
        {connections.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Current connections:</h2>
            <div className="space-y-2">
              {connections.map(partnerId => (
                <div key={partnerId} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                  <span className="text-sm break-all">{partnerId}</span>
                  <button
                    onClick={() => handleDisconnect(partnerId)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* パートナーのユーザーID入力 */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Partner's user ID:</label>
            <input
              type="text"
              value={partnerUserId}
              onChange={(e) => setPartnerUserId(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter partner's user ID"
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Connect'}
          </button>

          {message && (
            <div className={`p-3 rounded-md ${
              message.includes('completed') || message.includes('Disconnection')
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Connect; 