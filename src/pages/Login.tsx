import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const provider = new GoogleAuthProvider();

function Login() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      alert('ログインに失敗しました');
    }
  };

  return (
    <div style={{ margin: '2rem' }}>
      <h1>Welcome to Together Budget</h1>
      <button onClick={handleGoogleSignIn}>Googleでログイン</button>
    </div>
  );
}

export default Login; 