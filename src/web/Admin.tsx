import React, { useState, useEffect } from "react";
import { api } from "./api";
export function Admin({
  run,
  busy,
}: {
  run: (fn: () => Promise<void>) => Promise<void>;
  busy: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [form, setForm] = useState({
      name: "",
      url: "",
      kind: "product",
      permissionBasis: "",
      imagePermission: "",
    });
  const refresh = async () => setData(await api("v1/admin/overview"));
  useEffect(() => {
    void run(refresh);
  }, []);
  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Catalog & research</h1>
        </div>
        <button className="outline" onClick={() => run(refresh)}>
          Refresh
        </button>
      </div>
      {data && (
        <>
          <div className="summary-cards">
            <div>
              <strong>
                {data.jobs.filter((j: any) => j.status === "failed").length}
              </strong>
              <span>Recent failed jobs</span>
            </div>
            <div>
              <strong>
                {
                  data.proposals.filter((p: any) => p.status === "pending")
                    .length
                }
              </strong>
              <span>Product updates to review</span>
            </div>
            <div>
              <strong>
                $
                {data.usage
                  .reduce((s: number, u: any) => s + u.usd, 0)
                  .toFixed(2)}
              </strong>
              <span>
                Reserved variable cost · ${data.settings.budget} budget
              </span>
            </div>
          </div>
          <p className="notice">
            Agents {data.settings.agents ? "enabled" : "paused"} · Automatic
            publication {data.settings.autoPublish ? "enabled" : "paused"} ·
            Amounts are conservative estimates; check provider bills.
          </p>
          <section className="panel">
            <h2>Approved sources</h2>
            {data.sources.map((s: any) => (
              <div className="admin-row" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.url}</small>
                  <small>
                    {s.last_error ?? s.last_fetch_at ?? "No collection yet"}
                  </small>
                </div>
                <button
                  className="outline small"
                  disabled={busy || !s.enabled}
                  onClick={() =>
                    run(async () => {
                      await api("v1/admin/run", {
                        sourceId: s.id,
                        kind: s.kind === "science" ? "science" : "discover",
                      });
                      await refresh();
                    })
                  }
                >
                  Collect
                </button>
                <button
                  className="outline small"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`v1/admin/sources/${s.id}/toggle`, {});
                      await refresh();
                    })
                  }
                >
                  {s.enabled ? "Pause" : "Enable"}
                </button>
              </div>
            ))}
            <h3>Add an authorized source</h3>
            <div className="form-grid">
              {(
                [
                  ["name", "Source name"],
                  ["url", "HTTPS source URL"],
                  ["permissionBasis", "Basis for automated access"],
                  [
                    "imagePermission",
                    "Image reuse permission (leave blank if unknown)",
                  ],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Source type
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="product">Product catalog</option>
                  <option value="science">Scientific API</option>
                </select>
              </label>
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("v1/admin/sources", form);
                  setForm({
                    name: "",
                    url: "",
                    kind: "product",
                    permissionBasis: "",
                    imagePermission: "",
                  });
                  await refresh();
                })
              }
            >
              Register source
            </button>
          </section>
          <section className="panel">
            <h2>Product review queue</h2>
            {!data.proposals.some((p: any) => p.status === "pending") && (
              <p>No product updates awaiting review.</p>
            )}
            {data.proposals
              .filter((p: any) => p.status === "pending")
              .map((p: any) => {
                const d = JSON.parse(p.payload);
                return (
                  <article className="review" key={p.id}>
                    <h3>
                      {d.brand} · {d.name}
                    </h3>
                    {d.imageKey && (
                      <img
                        width="110"
                        height="110"
                        style={{ objectFit: "contain" }}
                        src={`/api/v1/admin/proposals/${p.id}/image`}
                        alt={`${d.name} collected label`}
                      />
                    )}
                    <p>{d.ingredients}</p>
                    <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                      Inspect source ↗
                    </a>
                    <p>{JSON.parse(p.reasons).join(" · ")}</p>
                    <div className="actions">
                      {["approve", "reject"].map((action) => (
                        <button
                          className="outline"
                          disabled={busy}
                          key={action}
                          onClick={() =>
                            run(async () => {
                              await api(
                                `v1/admin/proposals/${p.id}/${action}`,
                                {},
                              );
                              await refresh();
                            })
                          }
                        >
                          {action === "approve" ? "Approve update" : "Reject"}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
          </section>
          <section className="panel">
            <h2>Scientific comment review</h2>
            {!data.comments.some((c: any) =>
              ["pending", "needs-review"].includes(c.status),
            ) && <p>No comments awaiting review.</p>}
            {data.comments
              .filter((c: any) =>
                ["pending", "needs-review"].includes(c.status),
              )
              .map((c: any) => (
                <article className="review" key={c.id}>
                  <strong>
                    {c.ingredient_id ?? "General evidence"} · {c.status}
                  </strong>
                  <p>{c.body}</p>
                  <div>
                    {(JSON.parse(c.evidence_ids) as string[]).map((id) => {
                      const e = data.evidence.find((e: any) => e.id === id);
                      return e ? (
                        <p key={id}>
                          <a href={e.url} target="_blank" rel="noreferrer">
                            {e.title} ↗
                          </a>
                          <small>
                            {e.access_level} ·{" "}
                            {e.study_type ?? "Study type not established"} ·{" "}
                            {e.species ?? "Species not established"} ·{" "}
                            {e.license ?? "Abstract access only"}
                          </small>
                        </p>
                      ) : (
                        <small key={id}>Missing evidence: {id}</small>
                      );
                    })}
                  </div>
                  <div className="actions">
                    {["approve", "reject"].map((action) => (
                      <button
                        className="outline"
                        disabled={busy}
                        key={action}
                        onClick={() =>
                          run(async () => {
                            await api(
                              `v1/admin/comments/${c.id}/${action}`,
                              {},
                            );
                            await refresh();
                          })
                        }
                      >
                        {action === "approve"
                          ? "Approve after scientific review"
                          : "Reject"}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
          </section>
          <section className="panel">
            <h2>Recent jobs & alerts</h2>
            {data.alerts.slice(0, 10).map((a: any) => (
              <p className="message" key={a.id}>
                {a.message}
              </p>
            ))}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((j: any) => (
                    <tr key={j.id}>
                      <td>
                        {j.kind}
                        <small>{j.created_at}</small>
                      </td>
                      <td>{j.status}</td>
                      <td>{j.error ?? j.url ?? j.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
