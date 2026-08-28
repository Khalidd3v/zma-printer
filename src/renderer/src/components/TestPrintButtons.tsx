interface Props {
  onTest: (type: "thermal" | "a4") => void;
}

export default function TestPrintButtons({ onTest }: Props) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Test Print</h2>
      </div>
      <div className="button-row">
        <button className="btn" onClick={() => onTest("thermal")}>Thermal receipt</button>
        <button className="btn" onClick={() => onTest("a4")}>A4 invoice</button>
      </div>
      <p className="hint">Sends a sample job using the printers selected above.</p>
    </section>
  );
}
