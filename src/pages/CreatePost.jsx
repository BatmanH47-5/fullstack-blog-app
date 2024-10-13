import 'react-quill/dist/quill.snow.css';
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import Editor from "../Editor"; // Assuming this is your custom editor

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState(null);
  const [redirect, setRedirect] = useState(false);

  async function createNewPost(ev) {
    ev.preventDefault();
    const data = new FormData();
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    if (files) data.set('file', files[0]); // Check if files are selected

    const response = await fetch('http://localhost:4000/posts', { // Change to /posts
      method: 'POST',
      body: data,
      credentials: 'include',
    });

    if (response.ok) {
      setRedirect(true);
    } else {
      console.error('Error creating post:', await response.text());
    }
  }

  if (redirect) {
    return <Navigate to='/' />;
  }

  return (
    <form onSubmit={createNewPost}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={ev => setTitle(ev.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={ev => setSummary(ev.target.value)}
        required
      />
      <input
        type="file"
        onChange={ev => setFiles(ev.target.files)}
      />
      <Editor value={content} onChange={setContent} />
      <button style={{ marginTop: '5px' }}>Create Post</button>
    </form>
  );
}
