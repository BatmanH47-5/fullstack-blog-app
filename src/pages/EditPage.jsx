import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Editor from "../Editor";

export default function EditPost() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState(null);
  const [redirect, setRedirect] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch the post details from the backend
    fetch(`http://localhost:4000/posts/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching post: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(postInfo => {
        setTitle(postInfo.title);
        setSummary(postInfo.summary);
        setContent(postInfo.content);
      })
      .catch(err => setError(err.message)); // Improved error handling
  }, [id]);

  async function updatePost(ev) {
    ev.preventDefault();
    const data = new FormData();
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    data.set('id', id);

    if (files) {
      data.set('file', files[0]); // Use the first selected file
    }

    try {
      const response = await fetch('http://localhost:4000/posts', {
        method: 'PUT',
        body: data,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post'); // Capture error message from response
      }

      setRedirect(true);
    } catch (error) {
      console.error('Update error:', error);
      setError(error.message); // Display the error message to the user
    }
  }

  if (redirect) {
    return <Navigate to={`/post/${id}`} />;
  }

  return (
    <div>
      <form onSubmit={updatePost}>
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
        <Editor onChange={setContent} value={content} />
        <button style={{ marginTop: '5px' }}>Update post</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error messages */}
    </div>
  );
}
