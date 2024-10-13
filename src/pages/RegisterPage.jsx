import { useState } from "react";
import { Navigate } from "react-router-dom";

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [redirect, setRedirect] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function register(ev) {
    ev.preventDefault();
    const response = await fetch('http://localhost:4000/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 200) {
      alert('Registration successful');
      setRedirect(true); // Redirect to login after successful registration
    } else {
      const data = await response.json();
      setErrorMessage(data.error || 'Registration failed');
    }
  }

  if (redirect) {
    return <Navigate to="/login" />; // Redirect to the login page after registration
  }

  return (
    <div className="register">
      <h1>Register</h1>
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
          {errorMessage === 'Username already taken' && (
            <p>Please try a different username.</p>
          )}
        </div>
      )}
      <form onSubmit={register}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={ev => setUsername(ev.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={ev => setPassword(ev.target.value)}
        />
        <button>Register</button>
      </form>
    </div>
  );
}
