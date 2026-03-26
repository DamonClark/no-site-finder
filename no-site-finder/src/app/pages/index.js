import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const findBusinesses = async () => {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.businesses || []);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Find Businesses Without Websites</h1>
      <input
        type="text"
        placeholder="e.g., dentists in Austin"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: "0.5rem", width: "300px" }}
      />
      <button onClick={findBusinesses} style={{ marginLeft: "1rem", padding: "0.5rem" }}>
        Search
      </button>

      {loading && <p>🔎 Searching...</p>}

      <ul>
        {results.map((biz, i) => (
          <li key={i}>
            <strong>{biz.name}</strong><br />
            {biz.address}<br />
            {biz.phone}
            <hr />
          </li>
        ))}
      </ul>
    </div>
  );
}
