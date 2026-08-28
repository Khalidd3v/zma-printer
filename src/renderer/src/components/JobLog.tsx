import type { JobLogEntry } from "../../../main/types";

interface Props {
  jobs: JobLogEntry[];
  onClear: () => void;
}

export default function JobLog({ jobs, onClear }: Props) {
  return (
    <section className="card job-log">
      <div className="card-head">
        <h2>Job Log</h2>
        <button className="btn small" onClick={onClear}>Clear</button>
      </div>
      {jobs.length === 0 ? (
        <p className="empty">No print jobs yet.</p>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Invoice ID</th>
              <th>Customer</th>
              <th>Printer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.job_id}>
                <td>{new Date(job.timestamp).toLocaleString()}</td>
                <td>{job.invoice_number || "—"}</td>
                <td>{job.customer_name || "—"}</td>
                <td>{job.printer_name || "—"}</td>
                <td>
                  <span className={`badge ${job.success ? "badge-green" : "badge-red"}`}>
                    {job.success ? "Printed" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
