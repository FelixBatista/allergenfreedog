import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Food, compare } from "../shared/comparison";
import "./style.css";
import { api, emptyFood, type Product } from "./api";
import { FoodColumn } from "./FoodColumn";
import { Admin } from "./Admin";
type Result = ReturnType<typeof compare>;
function App() {
  const [products, setProducts] = useState<Product[]>([]),
    [triggering, setTriggering] = useState<Food[]>([emptyFood()]),
    [safe, setSafe] = useState<Food[]>([emptyFood()]);
  const [preferences, setPreferences] = useState({
    glutenFree: true,
    chickenFree: true,
    hydrolysedLow: true,
  });
  const [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("all");
  const [me, setMe] = useState<any>(null),
    [config, setConfig] = useState<any>({}),
    [dogs, setDogs] = useState<any[]>([]),
    [dogId, setDogId] = useState(""),
    [history, setHistory] = useState<any[]>([]),
    [tab, setTab] = useState(
      location.pathname === "/admin" ? "admin" : "compare",
    );
  const [evidence, setEvidence] = useState<any[]>([]),
    [candidate, setCandidate] = useState<Food>(emptyFood()),
    [assessment, setAssessment] = useState<any>(null),
    [explanation, setExplanation] = useState<any>(null),
    [status, setStatus] = useState("");
  const [resultInput, setResultInput] = useState<any>(null);
  const input = () => ({ triggering, safe, preferences });
  useEffect(() => {
    Promise.all([
      api("v1/products"),
      api("v1/me"),
      api("v1/config"),
      api("v1/evidence"),
    ])
      .then(([p, m, c, e]) => {
        setProducts(p);
        setMe(m);
        setConfig(c);
        setEvidence(e);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (me?.user)
      Promise.all([api("v1/private/dogs"), api("v1/private/comparisons")])
        .then(([d, h]) => {
          setDogs(d);
          setHistory(h);
          if (d.length) setDogId(d[0].id);
        })
        .catch((e) => setError(e.message));
  }, [me]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const build = () =>
    run(async () => {
      const current = input();
      setResult(await api("v1/compare", current));
      setResultInput(current);
      setAssessment(null);
      setExplanation(null);
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  const login = () =>
    run(async () => {
      const response = await api("auth/sign-in/social", {
        provider: "google",
        callbackURL: location.origin,
      });
      if (response.url) location.assign(response.url);
    });
  const createDog = () => {
    const name = prompt("Your dog's name");
    if (name)
      void run(async () => {
        const d = await api("v1/private/dogs", { name });
        setDogs([...dogs, d]);
        setDogId(d.id);
      });
  };
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">🐾</span>
          <span>
            Dog Allergy Check
            <small>Better choices begin with ingredients.</small>
          </span>
        </a>
        <nav>
          <button
            className={tab === "compare" ? "active-nav" : ""}
            onClick={() => setTab("compare")}
          >
            Compare food
          </button>
          <button onClick={() => setTab("evidence")}>Evidence</button>
          <a href="/blog/">Journal ↗</a>
          {me?.isAdmin && (
            <button onClick={() => setTab("admin")}>Admin</button>
          )}
        </nav>
        <div className="account">
          {me?.user ? (
            <>
              <span>{me.user.name}</span>
              <button
                className="outline small"
                onClick={() =>
                  run(async () => {
                    await api("auth/sign-out", {});
                    setMe(null);
                    setDogs([]);
                    setHistory([]);
                  })
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="outline small"
              disabled={!config.loginEnabled || busy}
              onClick={login}
            >
              {config.loginEnabled ? "Sign in with Google" : "Guest mode"}
            </button>
          )}
        </div>
      </header>
      <main>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        {status && (
          <div className="message" role="status">
            {status}
          </div>
        )}
        {tab === "compare" && (
          <>
            <section className="hero">
              <div>
                <span className="eyebrow">
                  A clearer picture of your dog's food
                </span>
                <h1>
                  Find the pattern.
                  <br />
                  <em>Choose with care.</em>
                </h1>
                <p>
                  Compare foods that caused problems with foods your dog
                  tolerated. Explore the ingredients that make a difference.
                </p>
                <div className="hero-tags">
                  <span>✓ Free ingredient comparison</span>
                  <span>✓ No sign-in needed</span>
                </div>
              </div>
              <aside className="hero-note">
                <span className="note-symbol">✳</span>
                <strong>Every dog has a different story.</strong>
                <p>
                  Your dog's history helps narrow the questions. A comparison
                  highlights patterns to investigate with your veterinarian.
                </p>
                <a href="#compare">Start with two foods ↓</a>
              </aside>
            </section>
            {me?.user && (
              <section className="profile-bar">
                <label>
                  Comparing for
                  <select
                    value={dogId}
                    onChange={(e) => setDogId(e.target.value)}
                  >
                    <option value="">Select a dog</option>
                    {dogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="outline" onClick={createDog}>
                  + Add dog
                </button>
                <label>
                  Saved comparisons
                  <select
                    value=""
                    onChange={(e) => {
                      const h = history.find((h) => h.id === e.target.value);
                      if (h) {
                        const i = JSON.parse(h.input);
                        setTriggering(i.triggering);
                        setSafe(i.safe);
                        setPreferences(i.preferences ?? preferences);
                        setResult(JSON.parse(h.result));
                        setResultInput(i);
                        setAssessment(null);
                        setExplanation(null);
                      }
                    }}
                  >
                    <option value="">Open a saved comparison</option>
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {dogs.find((d) => d.id === h.dog_id)?.name ?? "Dog"} ·{" "}
                        {h.created_at}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            )}
            <section className="comparison-card" id="compare">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Your food history</span>
                  <h2>What has your dog tried?</h2>
                </div>
                <span className="subtle">
                  Use the package label for the most current ingredients.
                </span>
              </div>
              <div className="columns">
                <FoodColumn
                  title="Foods that caused problems"
                  hint="Foods linked to symptoms you've observed"
                  foods={triggering}
                  onChange={setTriggering}
                  products={products}
                  tone="trigger"
                />
                <FoodColumn
                  title="Foods your dog tolerated"
                  hint="Foods eaten without the same symptoms"
                  foods={safe}
                  onChange={setSafe}
                  products={products}
                  tone="tolerated"
                />
              </div>
              <div className="compare-controls">
                <fieldset>
                  <legend>Highlight preferences</legend>
                  {(
                    [
                      ["glutenFree", "Gluten ingredients"],
                      ["chickenFree", "Poultry ingredients"],
                      ["hydrolysedLow", "Show hydrolysed markers"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="check" key={key}>
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            [key]: e.target.checked,
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <button className="primary" disabled={busy} onClick={build}>
                  {busy ? "Working…" : "Build comparison"} <span>↗</span>
                </button>
              </div>
            </section>
            <section id="results" className="results">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Look a little closer</span>
                  <h2>Your ingredient comparison</h2>
                </div>
                {result && (
                  <span className="count">
                    {result.rows.length} ingredients
                  </span>
                )}
              </div>
              {!result ? (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>A pattern starts with a comparison.</h3>
                  <p>
                    Add at least one food to each column to explore their
                    differences.
                  </p>
                </div>
              ) : (
                <>
                  <div className="summary-cards">
                    <div>
                      <strong>{result.nonSimilarIngredients.length}</strong>
                      <span>Only in problem foods</span>
                    </div>
                    <div>
                      <strong>
                        {result.rows.filter((r) => r.overlap).length}
                      </strong>
                      <span>In both groups</span>
                    </div>
                    <div>
                      <strong>{result.unknownCount}</strong>
                      <span>Need ingredient identification</span>
                    </div>
                  </div>
                  <p className="notice">
                    {result.notice} Ingredients in parentheses are preserved and
                    flagged for review.
                  </p>
                  <div className="toolbar">
                    <div className="chips">
                      {[
                        ["all", "All ingredients"],
                        ["suspect", "Potential differences"],
                        ["overlap", "In both groups"],
                        ["unknown", "Need review"],
                      ].map(([key, label]) => (
                        <button
                          className={filter === key ? "selected" : ""}
                          key={key}
                          onClick={() => setFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      className="outline"
                      disabled={!me?.user || !dogId || busy}
                      onClick={() =>
                        run(async () => {
                          await api("v1/private/comparisons", {
                            dogId,
                            comparison: resultInput,
                          });
                          setHistory(await api("v1/private/comparisons"));
                          setStatus(
                            "Comparison saved with its original ingredient snapshot.",
                          );
                        })
                      }
                    >
                      Save comparison
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          {result.foods.map((f) => (
                            <th key={f.index}>
                              {f.name}
                              <small>
                                {f.group === "triggering"
                                  ? "Problem food"
                                  : "Tolerated food"}
                              </small>
                            </th>
                          ))}
                          <th>What to investigate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows
                          .filter(
                            (r) =>
                              filter === "all" ||
                              (filter === "suspect" && r.suspect) ||
                              (filter === "overlap" && r.overlap) ||
                              (filter === "unknown" && r.requiresReview),
                          )
                          .map((r) => (
                            <tr
                              key={r.key}
                              className={r.suspect ? "suspect" : ""}
                            >
                              <th>
                                {r.name}
                                <small>{r.originals.join(" · ")}</small>
                              </th>
                              {r.presence.map((present, i) => (
                                <td key={i}>
                                  <span
                                    aria-label={
                                      present ? "Present" : "Not found"
                                    }
                                    className={present ? "present" : "absent"}
                                  >
                                    {present ? "●" : "—"}
                                  </span>
                                </td>
                              ))}
                              <td>
                                <span
                                  className={`badge ${r.suspect ? "amber" : ""}`}
                                >
                                  {r.suspect
                                    ? "Potential difference"
                                    : r.overlap
                                      ? "In both groups"
                                      : "Tolerated group only"}
                                </span>
                                {!r.recognized && (
                                  <small>Unrecognized ingredient</small>
                                )}
                                {r.focus && (
                                  <small>Matches a selected preference</small>
                                )}
                                {r.hydrolysedLow && (
                                  <small>
                                    Hydrolysed marker · tolerance is not
                                    guaranteed
                                  </small>
                                )}
                                {r.requiresReview && (
                                  <small>Review original label details</small>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="next-grid">
                    <section className="panel">
                      <h3>Check a new food</h3>
                      <p>
                        Look for matches with the potential differences above.
                      </p>
                      <label>
                        Choose a food
                        <select
                          value={candidate.id ?? ""}
                          onChange={(e) =>
                            setCandidate(
                              products.find((p) => p.id === e.target.value) ??
                                emptyFood(),
                            )
                          }
                        >
                          <option value="">Custom — paste ingredients</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.brand} · {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ingredients
                        <textarea
                          rows={4}
                          value={candidate.ingredients}
                          onChange={(e) =>
                            setCandidate({
                              ...candidate,
                              id: undefined,
                              ingredients: e.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        className="outline"
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setAssessment(
                              await api("v1/assess", {
                                candidate,
                                comparison: resultInput,
                              }),
                            ),
                          )
                        }
                      >
                        Check ingredients
                      </button>
                      {assessment && (
                        <div className="assessment">
                          <strong>
                            {assessment.matches.length
                              ? `${assessment.matches.length} potential matches`
                              : "No known matches found"}
                          </strong>
                          <p>
                            {assessment.matches
                              .map((m: any) => m.raw)
                              .join(", ")}
                          </p>
                          <p>
                            {assessment.unknownCount} ingredients need
                            identification. {assessment.notice}
                          </p>
                        </div>
                      )}
                    </section>
                    <section className="panel evidence-panel">
                      <span className="eyebrow">Evidence, with context</span>
                      <h3>Understand your results</h3>
                      <p>
                        Get an explanation grounded in reviewed scientific
                        comments, with references you can read.
                      </p>
                      <button
                        className="outline"
                        disabled={!me?.user || busy}
                        onClick={() =>
                          run(async () =>
                            setExplanation(
                              await api("v1/private/explain", resultInput),
                            ),
                          )
                        }
                      >
                        {me?.user
                          ? "Explain this comparison"
                          : "Sign in to request an explanation"}
                      </button>
                      {explanation && (
                        <div className="explanation">
                          <p>{explanation.text}</p>
                          {explanation.references.map((r: any) => (
                            <a
                              key={r.id}
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {r.title} ↗
                            </a>
                          ))}
                        </div>
                      )}
                      <small>
                        Scientific comments are reviewed before publication. AI
                        availability depends on the configured budget.
                      </small>
                    </section>
                  </div>
                </>
              )}
            </section>
            <section className="how">
              <span className="eyebrow">A thoughtful starting point</span>
              <h2>From a label to a better question.</h2>
              <div>
                {[
                  [
                    "1",
                    "Share the history",
                    "Add problem foods and foods that were tolerated.",
                  ],
                  [
                    "2",
                    "Spot the differences",
                    "Explore ingredients found only in the problem group.",
                  ],
                  [
                    "3",
                    "Follow the evidence",
                    "Review sources and take questions to your veterinarian.",
                  ],
                ].map(([n, h, p]) => (
                  <article key={n}>
                    <span>{n}</span>
                    <h3>{h}</h3>
                    <p>{p}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        {tab === "evidence" && (
          <section className="page">
            <span className="eyebrow">Traceable knowledge</span>
            <h1>Evidence library</h1>
            <p>
              Reviewed comments linked to their original research. Corrected or
              retracted sources are held for review.
            </p>
            {!evidence.length ? (
              <div className="empty-state">
                <h3>No reviewed comments published yet.</h3>
                <p>
                  The research worker prepares drafts for review. Unreviewed
                  summaries are never presented as established evidence.
                </p>
              </div>
            ) : (
              evidence.map((e: any) => (
                <article className="panel" key={`${e.id}-${e.evidence_id}`}>
                  <p>{e.body}</p>
                  <a href={e.url} target="_blank" rel="noreferrer">
                    {e.title} ↗
                  </a>
                  <small>Reviewed {e.reviewed_at}</small>
                </article>
              ))
            )}
          </section>
        )}
        {tab === "admin" &&
          (me?.isAdmin ? (
            <Admin run={run} busy={busy} />
          ) : (
            <section className="page">
              <h1>Administration</h1>
              <p>
                Sign in with an administrator account to manage sources and
                review updates.
              </p>
            </section>
          ))}
      </main>
      <footer>
        <a className="brand" href="/">
          🐾 Dog Allergy Check
        </a>
        <p>
          Food history offers clues. Your veterinarian helps interpret them.
        </p>
        <div>
          <a href="/blog/">Journal</a>
          <button className="text-button" onClick={() => setTab("evidence")}>
            Evidence library
          </button>
          <a href="/allergy-testing.html">Testing guide</a>
        </div>
        <small>
          © {new Date().getFullYear()} Dog Allergy Check · For information only.
        </small>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
